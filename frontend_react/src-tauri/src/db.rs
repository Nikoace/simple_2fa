use rusqlite::{params, Connection};
use serde::Serialize;
use std::path::Path;

use crate::crypto::ExportAccount;
use crate::totp::{generate_totp_with_ttl, validate_secret, TotpError};

/// Database-level account representation (includes secret).
#[derive(Clone)]
pub struct Account {
    pub id: i64,
    pub name: String,
    pub issuer: Option<String>,
    pub secret: String,
}

// 手写 Debug：遮蔽 secret，防止密钥经 {:?} 泄漏到日志
impl std::fmt::Debug for Account {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Account")
            .field("id", &self.id)
            .field("name", &self.name)
            .field("issuer", &self.issuer)
            .field("secret", &"<redacted>")
            .finish()
    }
}

/// Account returned to frontend (includes generated TOTP code, no secret).
#[derive(Debug, Clone, Serialize)]
pub struct AccountWithCode {
    pub id: i64,
    pub name: String,
    pub issuer: Option<String>,
    pub code: String,
    pub ttl: u64,
}

/// Account returned after create/update (no secret, no code).
#[derive(Debug, Clone, Serialize)]
pub struct AccountRead {
    pub id: i64,
    pub name: String,
    pub issuer: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("Database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("Account not found: id={0}")]
    NotFound(i64),
    // 使用 transparent 直接透传 TotpError，避免重复 "Invalid secret:" 前缀
    #[error(transparent)]
    InvalidSecret(#[from] TotpError),
    #[error("数据库迁移失败: {0}")]
    Migration(String),
}

const SCHEMA: &str = "CREATE TABLE IF NOT EXISTS account (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    issuer TEXT,
    secret TEXT NOT NULL
);";

/// 32 字节密钥编码为 SQLCipher 原始密钥所需的十六进制串
fn key_to_hex(key: &[u8; 32]) -> String {
    key.iter().map(|b| format!("{:02x}", b)).collect()
}

/// 打开数据库并用原始密钥解锁（不经 KDF，密钥已是 CSPRNG 随机字节）
fn open_encrypted(db_path: &Path, key_hex: &str) -> Result<Connection, DbError> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch(&format!("PRAGMA key = \"x'{}'\";", key_hex))?;
    Ok(conn)
}

/// 能否用当前密钥读取数据库（读 sqlite_master 会触发解密校验）
fn is_readable(conn: &Connection) -> bool {
    conn.query_row("SELECT count(*) FROM sqlite_master", [], |_| Ok(()))
        .is_ok()
}

/// 将旧版明文数据库迁移为 SQLCipher 加密数据库（原地替换文件）
fn migrate_plaintext_to_encrypted(db_path: &Path, key_hex: &str) -> Result<(), DbError> {
    let plain = Connection::open(db_path)?;
    // 确认确实是可读的明文 sqlite（若是错误密钥打开的加密库，这里会失败并中止，避免破坏数据）
    plain.query_row("SELECT count(*) FROM sqlite_master", [], |_| Ok(()))?;

    let tmp = db_path.with_extension("db.migrating");
    let _ = std::fs::remove_file(&tmp); // 清理上次失败残留
    let tmp_str = tmp
        .to_str()
        .ok_or_else(|| DbError::Migration("临时文件路径包含非法字符".to_string()))?
        .replace('\'', "''"); // 转义单引号，防止路径破坏 SQL

    // sqlcipher_export 把明文库整体导出到新的加密库
    plain.execute_batch(&format!(
        "ATTACH DATABASE '{tmp_str}' AS enc KEY \"x'{key_hex}'\"; \
         SELECT sqlcipher_export('enc'); \
         DETACH DATABASE enc;"
    ))?;
    drop(plain);

    std::fs::rename(&tmp, db_path)
        .map_err(|e| DbError::Migration(format!("替换数据库文件失败: {e}")))?;
    Ok(())
}

/// 初始化加密数据库，必要时从旧版明文库迁移，并确保表存在。
/// key 由 OS keyring 提供，用作 SQLCipher 原始密钥。
pub fn init_db(db_path: &Path, key: &[u8; 32]) -> Result<Connection, DbError> {
    let key_hex = key_to_hex(key);

    // 已存在的文件：先尝试用密钥打开；打不开则视为旧版明文库并迁移
    if db_path.exists() {
        let conn = open_encrypted(db_path, &key_hex)?;
        if is_readable(&conn) {
            conn.execute_batch(SCHEMA)?;
            return Ok(conn);
        }
        drop(conn);
        migrate_plaintext_to_encrypted(db_path, &key_hex)?;
    }

    let conn = open_encrypted(db_path, &key_hex)?;
    conn.execute_batch(SCHEMA)?;
    Ok(conn)
}

/// Initialize an in-memory database (for testing).
#[cfg(test)]
pub fn init_db_memory() -> Result<Connection, DbError> {
    let conn = Connection::open_in_memory()?;
    conn.execute_batch(SCHEMA)?;
    Ok(conn)
}

/// List all accounts with their current TOTP codes.
/// Accounts with invalid secrets are skipped (same behavior as Python version).
pub fn list_accounts_with_codes(conn: &Connection) -> Result<Vec<AccountWithCode>, DbError> {
    let mut stmt = conn.prepare("SELECT id, name, issuer, secret FROM account")?;
    let accounts = stmt.query_map([], |row| {
        Ok(Account {
            id: row.get(0)?,
            name: row.get(1)?,
            issuer: row.get(2)?,
            secret: row.get(3)?,
        })
    })?;

    let mut results = Vec::new();
    for account in accounts {
        let account = account?;
        // Skip accounts with invalid secrets (log would be nice here)
        match generate_totp_with_ttl(&account.secret) {
            Ok((code, ttl)) => {
                results.push(AccountWithCode {
                    id: account.id,
                    name: account.name,
                    issuer: account.issuer,
                    code,
                    ttl,
                });
            }
            Err(_) => {
                log::error!(
                    "Error generating TOTP for account {} ({})",
                    account.id,
                    account.name
                );
                continue;
            }
        }
    }
    Ok(results)
}

/// Create a new account. Validates the secret before storing.
pub fn create_account(
    conn: &Connection,
    name: &str,
    issuer: Option<&str>,
    secret: &str,
) -> Result<AccountRead, DbError> {
    // Validate secret first
    validate_secret(secret)?;

    conn.execute(
        "INSERT INTO account (name, issuer, secret) VALUES (?1, ?2, ?3)",
        params![name, issuer, secret],
    )?;
    let id = conn.last_insert_rowid();
    Ok(AccountRead {
        id,
        name: name.to_string(),
        issuer: issuer.map(|s| s.to_string()),
    })
}

/// Update an existing account. Only provided fields are updated.
pub fn update_account(
    conn: &Connection,
    id: i64,
    name: Option<&str>,
    issuer: Option<&str>,
    secret: Option<&str>,
) -> Result<AccountRead, DbError> {
    // Check account exists
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM account WHERE id = ?1)",
        params![id],
        |row| row.get(0),
    )?;
    if !exists {
        return Err(DbError::NotFound(id));
    }

    // Validate new secret if provided
    if let Some(s) = secret {
        validate_secret(s)?;
    }

    // Build a single atomic UPDATE containing only the provided fields
    let mut set_clauses: Vec<String> = Vec::new();
    let mut bindings: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    if let Some(n) = name {
        set_clauses.push(format!("name = ?{}", bindings.len() + 1));
        bindings.push(Box::new(n.to_string()));
    }
    if let Some(i) = issuer {
        set_clauses.push(format!("issuer = ?{}", bindings.len() + 1));
        bindings.push(Box::new(i.to_string()));
    }
    if let Some(s) = secret {
        set_clauses.push(format!("secret = ?{}", bindings.len() + 1));
        bindings.push(Box::new(s.to_string()));
    }
    if !set_clauses.is_empty() {
        let sql = format!(
            "UPDATE account SET {} WHERE id = ?{}",
            set_clauses.join(", "),
            bindings.len() + 1
        );
        bindings.push(Box::new(id));
        conn.execute(&sql, rusqlite::params_from_iter(bindings.iter()))?;
    }

    // Return updated account
    let account = conn.query_row(
        "SELECT id, name, issuer FROM account WHERE id = ?1",
        params![id],
        |row| {
            Ok(AccountRead {
                id: row.get(0)?,
                name: row.get(1)?,
                issuer: row.get(2)?,
            })
        },
    )?;

    Ok(account)
}

/// 导出所有账户（含密钥），仅用于加密备份，绝不直接发送到前端
pub fn list_accounts_for_export(conn: &Connection) -> Result<Vec<ExportAccount>, DbError> {
    let mut stmt = conn.prepare("SELECT name, issuer, secret FROM account")?;
    let accounts = stmt
        .query_map([], |row| {
            Ok(ExportAccount {
                name: row.get(0)?,
                issuer: row.get(1)?,
                secret: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(accounts)
}

/// 按 ID 列表导出指定账户（含密钥），IDs 为空时返回空列表
pub fn list_accounts_by_ids(conn: &Connection, ids: &[i64]) -> Result<Vec<ExportAccount>, DbError> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    // 动态构建 IN (?, ?, ...) 占位符
    let placeholders = (1..=ids.len())
        .map(|i| format!("?{}", i))
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "SELECT name, issuer, secret FROM account WHERE id IN ({}) ORDER BY id",
        placeholders
    );
    let mut stmt = conn.prepare(&sql)?;
    let accounts = stmt
        .query_map(rusqlite::params_from_iter(ids.iter()), |row| {
            Ok(ExportAccount {
                name: row.get(0)?,
                issuer: row.get(1)?,
                secret: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(accounts)
}

/// 查找指定 name + issuer 的账户 ID，用于导入时检测重复
pub fn find_account_by_name_issuer(
    conn: &Connection,
    name: &str,
    issuer: Option<&str>,
) -> Result<Option<i64>, DbError> {
    let result = match issuer {
        Some(iss) => conn.query_row(
            "SELECT id FROM account WHERE name = ?1 AND issuer = ?2",
            params![name, iss],
            |row| row.get(0),
        ),
        None => conn.query_row(
            "SELECT id FROM account WHERE name = ?1 AND issuer IS NULL",
            params![name],
            |row| row.get(0),
        ),
    };
    match result {
        Ok(id) => Ok(Some(id)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(DbError::Sqlite(e)),
    }
}

/// Delete an account by ID.
pub fn delete_account(conn: &Connection, id: i64) -> Result<(), DbError> {
    let affected = conn.execute("DELETE FROM account WHERE id = ?1", params![id])?;
    if affected == 0 {
        return Err(DbError::NotFound(id));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID_SECRET: &str = "JBSWY3DPEHPK3PXP";

    fn setup_db() -> Connection {
        init_db_memory().unwrap()
    }

    // --- SQLCipher 加密 / 迁移测试 ---

    #[test]
    fn test_encrypted_db_unreadable_without_key() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("accounts.db");
        let key = [7u8; 32];

        {
            let conn = init_db(&path, &key).unwrap();
            create_account(&conn, "alice", Some("GitHub"), VALID_SECRET).unwrap();
        }

        // 用普通 sqlite（无 PRAGMA key）打开，读取应失败——证明文件在磁盘上是密文
        let plain = Connection::open(&path).unwrap();
        assert!(plain
            .query_row("SELECT count(*) FROM account", [], |r| r.get::<_, i64>(0))
            .is_err());

        // 用正确密钥重新打开，数据完好
        let conn = init_db(&path, &key).unwrap();
        let n: i64 = conn
            .query_row("SELECT count(*) FROM account", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 1);
    }

    #[test]
    fn test_wrong_key_fails_without_data_loss() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("accounts.db");

        {
            let conn = init_db(&path, &[1u8; 32]).unwrap();
            create_account(&conn, "alice", None, VALID_SECRET).unwrap();
        }

        // 错误密钥：既读不出，也不能把加密库误判为明文而破坏它
        assert!(init_db(&path, &[2u8; 32]).is_err());

        // 正确密钥仍可读，数据未损坏
        let conn = init_db(&path, &[1u8; 32]).unwrap();
        let n: i64 = conn
            .query_row("SELECT count(*) FROM account", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 1);
    }

    #[test]
    fn test_migrates_legacy_plaintext_db() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("accounts.db");

        // 手工造一个旧版明文库
        {
            let conn = Connection::open(&path).unwrap();
            conn.execute_batch(SCHEMA).unwrap();
            conn.execute(
                "INSERT INTO account (name, issuer, secret) VALUES ('legacy', NULL, ?1)",
                params![VALID_SECRET],
            )
            .unwrap();
        }

        // init_db 应检测到明文并迁移为加密库，数据保留
        let key = [9u8; 32];
        let conn = init_db(&path, &key).unwrap();
        let n: i64 = conn
            .query_row("SELECT count(*) FROM account", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 1);
        drop(conn);

        // 迁移后文件已加密：普通 sqlite 读不出
        let plain = Connection::open(&path).unwrap();
        assert!(plain
            .query_row("SELECT count(*) FROM account", [], |r| r.get::<_, i64>(0))
            .is_err());
    }

    #[test]
    fn test_init_db_creates_table() {
        let conn = setup_db();
        // Verify the table exists by querying it
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM account", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_create_account() {
        let conn = setup_db();
        let result = create_account(&conn, "Test Service", Some("TestCorp"), VALID_SECRET);
        assert!(result.is_ok());
        let account = result.unwrap();
        assert_eq!(account.name, "Test Service");
        assert_eq!(account.issuer, Some("TestCorp".to_string()));
        assert!(account.id > 0);
    }

    #[test]
    fn test_create_account_invalid_secret() {
        let conn = setup_db();
        let result = create_account(&conn, "Test", Some("Test"), "");
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("Invalid secret"), "Got: {}", err);
    }

    #[test]
    fn test_list_accounts_with_codes() {
        let conn = setup_db();
        create_account(&conn, "Service A", Some("Corp A"), VALID_SECRET).unwrap();
        create_account(&conn, "Service B", None, VALID_SECRET).unwrap();

        let accounts = list_accounts_with_codes(&conn).unwrap();
        assert_eq!(accounts.len(), 2);

        // Check first account has valid code
        assert_eq!(accounts[0].name, "Service A");
        assert_eq!(accounts[0].code.len(), 6);
        assert!(accounts[0].code.chars().all(|c| c.is_ascii_digit()));
        assert!(accounts[0].ttl >= 1 && accounts[0].ttl <= 30);

        // Check second account
        assert_eq!(accounts[1].name, "Service B");
        assert!(accounts[1].issuer.is_none());
    }

    #[test]
    fn test_update_account_name() {
        let conn = setup_db();
        let created = create_account(&conn, "Old Name", Some("Corp"), VALID_SECRET).unwrap();

        let updated = update_account(&conn, created.id, Some("New Name"), None, None).unwrap();
        assert_eq!(updated.name, "New Name");
        assert_eq!(updated.issuer, Some("Corp".to_string()));
    }

    #[test]
    fn test_update_account_not_found() {
        let conn = setup_db();
        let result = update_account(&conn, 999, Some("Name"), None, None);
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("not found"), "Got: {}", err);
    }

    #[test]
    fn test_update_account_invalid_secret() {
        let conn = setup_db();
        let created = create_account(&conn, "Test", Some("Corp"), VALID_SECRET).unwrap();

        let result = update_account(&conn, created.id, None, None, Some(""));
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("Invalid secret"), "Got: {}", err);
    }

    #[test]
    fn test_delete_account() {
        let conn = setup_db();
        let created = create_account(&conn, "ToDelete", None, VALID_SECRET).unwrap();

        assert!(delete_account(&conn, created.id).is_ok());

        // Verify it's gone
        let accounts = list_accounts_with_codes(&conn).unwrap();
        assert_eq!(accounts.len(), 0);
    }

    #[test]
    fn test_delete_account_not_found() {
        let conn = setup_db();
        let result = delete_account(&conn, 999);
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("not found"), "Got: {}", err);
    }

    #[test]
    fn test_create_multiple_and_list() {
        let conn = setup_db();
        for i in 0..5 {
            create_account(&conn, &format!("Service {}", i), Some("Corp"), VALID_SECRET).unwrap();
        }
        let accounts = list_accounts_with_codes(&conn).unwrap();
        assert_eq!(accounts.len(), 5);
    }

    #[test]
    fn test_list_accounts_for_export_includes_secrets() {
        let conn = setup_db();
        create_account(&conn, "alice", Some("GitHub"), VALID_SECRET).unwrap();
        create_account(&conn, "bob", None, VALID_SECRET).unwrap();

        let exported = list_accounts_for_export(&conn).unwrap();
        assert_eq!(exported.len(), 2);
        assert_eq!(exported[0].name, "alice");
        assert_eq!(exported[0].issuer, Some("GitHub".to_string()));
        assert_eq!(exported[0].secret, VALID_SECRET);
        assert_eq!(exported[1].name, "bob");
        assert!(exported[1].issuer.is_none());
    }

    #[test]
    fn test_list_accounts_for_export_empty() {
        let conn = setup_db();
        let exported = list_accounts_for_export(&conn).unwrap();
        assert!(exported.is_empty());
    }

    #[test]
    fn test_find_account_by_name_issuer_found() {
        let conn = setup_db();
        let created = create_account(&conn, "alice", Some("GitHub"), VALID_SECRET).unwrap();

        let result = find_account_by_name_issuer(&conn, "alice", Some("GitHub")).unwrap();
        assert_eq!(result, Some(created.id));
    }

    #[test]
    fn test_find_account_by_name_issuer_not_found() {
        let conn = setup_db();
        create_account(&conn, "alice", Some("GitHub"), VALID_SECRET).unwrap();

        let result = find_account_by_name_issuer(&conn, "bob", Some("GitHub")).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_list_accounts_by_ids_returns_subset() {
        let conn = setup_db();
        let a = create_account(&conn, "alice", Some("GitHub"), VALID_SECRET).unwrap();
        let _b = create_account(&conn, "bob", None, VALID_SECRET).unwrap();
        let c = create_account(&conn, "carol", Some("GitLab"), VALID_SECRET).unwrap();

        let result = list_accounts_by_ids(&conn, &[a.id, c.id]).unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].name, "alice");
        assert_eq!(result[1].name, "carol");
    }

    #[test]
    fn test_list_accounts_by_ids_empty_returns_empty() {
        let conn = setup_db();
        create_account(&conn, "alice", Some("GitHub"), VALID_SECRET).unwrap();
        let result = list_accounts_by_ids(&conn, &[]).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_list_accounts_by_ids_all_ids() {
        let conn = setup_db();
        let a = create_account(&conn, "alice", Some("GitHub"), VALID_SECRET).unwrap();
        let b = create_account(&conn, "bob", None, VALID_SECRET).unwrap();
        let result = list_accounts_by_ids(&conn, &[a.id, b.id]).unwrap();
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_list_accounts_by_ids_nonexistent_silently_omitted() {
        let conn = setup_db();
        let a = create_account(&conn, "alice", Some("GitHub"), VALID_SECRET).unwrap();
        let result = list_accounts_by_ids(&conn, &[a.id, 9999]).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "alice");
    }

    #[test]
    fn test_list_accounts_by_ids_preserves_secret() {
        let conn = setup_db();
        let a = create_account(&conn, "alice", Some("GitHub"), VALID_SECRET).unwrap();
        let result = list_accounts_by_ids(&conn, &[a.id]).unwrap();
        assert_eq!(result[0].secret, VALID_SECRET);
    }

    #[test]
    fn test_find_account_by_name_issuer_none_issuer() {
        let conn = setup_db();
        let created = create_account(&conn, "alice", None, VALID_SECRET).unwrap();

        let found = find_account_by_name_issuer(&conn, "alice", None).unwrap();
        assert_eq!(found, Some(created.id));

        // issuer=Some("X") 不匹配 issuer=NULL
        let not_found = find_account_by_name_issuer(&conn, "alice", Some("X")).unwrap();
        assert!(not_found.is_none());
    }
}
