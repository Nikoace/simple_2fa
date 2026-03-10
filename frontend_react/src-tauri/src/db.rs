use rusqlite::{params, Connection};
use serde::Serialize;
use std::path::Path;

use crate::totp::{generate_totp, get_ttl, validate_secret, TotpError};

/// Database-level account representation (includes secret).
#[derive(Debug, Clone)]
pub struct Account {
    pub id: i64,
    pub name: String,
    pub issuer: Option<String>,
    pub secret: String,
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
}

/// Initialize the database, creating the accounts table if it doesn't exist.
pub fn init_db(db_path: &Path) -> Result<Connection, DbError> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS account (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            name  TEXT NOT NULL,
            issuer TEXT,
            secret TEXT NOT NULL
        );",
    )?;
    Ok(conn)
}

/// Initialize an in-memory database (for testing).
#[cfg(test)]
pub fn init_db_memory() -> Result<Connection, DbError> {
    let conn = Connection::open_in_memory()?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS account (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            name  TEXT NOT NULL,
            issuer TEXT,
            secret TEXT NOT NULL
        );",
    )?;
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
        match (generate_totp(&account.secret), get_ttl(&account.secret)) {
            (Ok(code), Ok(ttl)) => {
                results.push(AccountWithCode {
                    id: account.id,
                    name: account.name,
                    issuer: account.issuer,
                    code,
                    ttl,
                });
            }
            _ => {
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

    // Build dynamic update
    if let Some(n) = name {
        conn.execute("UPDATE account SET name = ?1 WHERE id = ?2", params![n, id])?;
    }
    if let Some(i) = issuer {
        conn.execute(
            "UPDATE account SET issuer = ?1 WHERE id = ?2",
            params![i, id],
        )?;
    }
    if let Some(s) = secret {
        conn.execute(
            "UPDATE account SET secret = ?1 WHERE id = ?2",
            params![s, id],
        )?;
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
}
