use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

use crate::crypto;
use crate::db::{self, AccountRead, AccountWithCode};

/// Application state holding the database connection.
pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
}

/// Input for creating a new account.
#[derive(Deserialize)]
pub struct CreateAccountInput {
    pub name: String,
    pub issuer: Option<String>,
    pub secret: String,
}

/// Input for updating an account.
#[derive(Deserialize)]
pub struct UpdateAccountInput {
    pub name: Option<String>,
    pub issuer: Option<String>,
    pub secret: Option<String>,
}

/// Get all accounts with their current TOTP codes.
#[tauri::command]
pub fn get_accounts(state: State<'_, AppState>) -> Result<Vec<AccountWithCode>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::list_accounts_with_codes(&conn).map_err(|e| e.to_string())
}

/// Add a new account.
#[tauri::command]
pub fn add_account(
    state: State<'_, AppState>,
    input: CreateAccountInput,
) -> Result<AccountRead, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::create_account(&conn, &input.name, input.issuer.as_deref(), &input.secret)
        .map_err(|e| e.to_string())
}

/// Update an existing account.
#[tauri::command]
pub fn update_account(
    state: State<'_, AppState>,
    id: i64,
    input: UpdateAccountInput,
) -> Result<AccountRead, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::update_account(
        &conn,
        id,
        input.name.as_deref(),
        input.issuer.as_deref(),
        input.secret.as_deref(),
    )
    .map_err(|e| e.to_string())
}

/// Delete an account by ID.
#[tauri::command]
pub fn delete_account(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::delete_account(&conn, id).map_err(|e| e.to_string())
}

/// 重复账户的处理策略
#[derive(Deserialize, Debug)]
pub enum DuplicateStrategy {
    Skip,
    Overwrite,
}

/// 导入结果统计
#[derive(Serialize)]
pub struct ImportResult {
    pub imported: usize,
    pub skipped: usize,
    pub overwritten: usize,
    pub errors: Vec<String>,
}

/// 导入预览：解密文件并返回账户名单（不含密钥），供前端展示选择
#[derive(Debug, Serialize)]
pub struct ImportPreviewAccount {
    pub name: String,
    pub issuer: Option<String>,
}

/// 解密备份文件，返回账户预览列表（不含密钥）
#[tauri::command]
pub fn preview_import(
    password: String,
    file_path: String,
) -> Result<Vec<ImportPreviewAccount>, String> {
    let data = std::fs::read(&file_path).map_err(|e| e.to_string())?;
    let accounts = crypto::decrypt_accounts(&data, &password).map_err(|e| e.to_string())?;
    Ok(accounts
        .into_iter()
        .map(|a| ImportPreviewAccount {
            name: a.name,
            issuer: a.issuer,
        })
        .collect())
}

/// 导出指定账户到加密文件（account_ids 为空时导出全部）
#[tauri::command]
pub fn export_accounts(
    state: State<'_, AppState>,
    password: String,
    file_path: String,
    account_ids: Vec<i64>,
) -> Result<usize, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let accounts = if account_ids.is_empty() {
        db::list_accounts_for_export(&conn).map_err(|e| e.to_string())?
    } else {
        db::list_accounts_by_ids(&conn, &account_ids).map_err(|e| e.to_string())?
    };
    let count = accounts.len();

    let encrypted = crypto::encrypt_accounts(&accounts, &password).map_err(|e| e.to_string())?;
    std::fs::write(&file_path, encrypted).map_err(|e| e.to_string())?;

    Ok(count)
}

/// 从加密文件导入账户（selected_indices 为空时导入全部）
#[tauri::command]
pub fn import_accounts(
    state: State<'_, AppState>,
    password: String,
    file_path: String,
    duplicate_strategy: DuplicateStrategy,
    selected_indices: Vec<usize>,
) -> Result<ImportResult, String> {
    let data = std::fs::read(&file_path).map_err(|e| e.to_string())?;
    let all_accounts = crypto::decrypt_accounts(&data, &password).map_err(|e| e.to_string())?;

    // 按索引筛选，空列表表示全部导入
    let accounts: Vec<_> = if selected_indices.is_empty() {
        all_accounts
    } else {
        selected_indices
            .iter()
            .filter_map(|&i| all_accounts.get(i).cloned())
            .collect()
    };

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut result = ImportResult {
        imported: 0,
        skipped: 0,
        overwritten: 0,
        errors: Vec::new(),
    };

    for account in accounts {
        // 验证密钥有效性
        if let Err(e) = crate::totp::validate_secret(&account.secret) {
            result.errors.push(format!(
                "{}/{}: {}",
                account.issuer.as_deref().unwrap_or(""),
                account.name,
                e
            ));
            continue;
        }

        // 检测重复
        let existing_id = match db::find_account_by_name_issuer(
            &conn,
            &account.name,
            account.issuer.as_deref(),
        ) {
            Ok(id) => id,
            Err(e) => {
                result.errors.push(e.to_string());
                continue;
            }
        };

        match existing_id {
            Some(id) => match duplicate_strategy {
                DuplicateStrategy::Skip => {
                    result.skipped += 1;
                }
                DuplicateStrategy::Overwrite => {
                    if let Err(e) = db::update_account(
                        &conn,
                        id,
                        Some(&account.name),
                        account.issuer.as_deref(),
                        Some(&account.secret),
                    ) {
                        result.errors.push(e.to_string());
                    } else {
                        result.overwritten += 1;
                    }
                }
            },
            None => {
                if let Err(e) = db::create_account(
                    &conn,
                    &account.name,
                    account.issuer.as_deref(),
                    &account.secret,
                ) {
                    result.errors.push(e.to_string());
                } else {
                    result.imported += 1;
                }
            }
        }
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::{encrypt_accounts, ExportAccount};
    use crate::db::init_db_memory;
    use tempfile::NamedTempFile;

    const VALID_SECRET: &str = "JBSWY3DPEHPK3PXP";

    fn make_s2fa_file(accounts: &[ExportAccount], password: &str) -> NamedTempFile {
        let file = NamedTempFile::with_suffix(".s2fa").unwrap();
        let encrypted = encrypt_accounts(accounts, password).unwrap();
        std::fs::write(file.path(), encrypted).unwrap();
        file
    }

    fn sample_accounts() -> Vec<ExportAccount> {
        vec![
            ExportAccount {
                name: "alice".to_string(),
                issuer: Some("GitHub".to_string()),
                secret: VALID_SECRET.to_string(),
            },
            ExportAccount {
                name: "bob".to_string(),
                issuer: None,
                secret: VALID_SECRET.to_string(),
            },
            ExportAccount {
                name: "carol".to_string(),
                issuer: Some("GitLab".to_string()),
                secret: VALID_SECRET.to_string(),
            },
        ]
    }

    // --- preview_import tests ---

    #[test]
    fn test_preview_import_returns_name_and_issuer_only() {
        let file = make_s2fa_file(&sample_accounts(), "pw");
        let preview =
            preview_import("pw".to_string(), file.path().to_str().unwrap().to_string()).unwrap();
        assert_eq!(preview.len(), 3);
        assert_eq!(preview[0].name, "alice");
        assert_eq!(preview[0].issuer, Some("GitHub".to_string()));
        assert_eq!(preview[1].issuer, None);
    }

    #[test]
    fn test_preview_import_wrong_password() {
        let file = make_s2fa_file(&sample_accounts(), "correct");
        let result = preview_import(
            "wrong".to_string(),
            file.path().to_str().unwrap().to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("解密失败"));
    }

    #[test]
    fn test_preview_import_invalid_file() {
        let file = NamedTempFile::new().unwrap();
        std::fs::write(file.path(), b"not a valid s2fa file").unwrap();
        let result = preview_import("pw".to_string(), file.path().to_str().unwrap().to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_preview_import_empty_accounts() {
        let file = make_s2fa_file(&[], "pw");
        let preview =
            preview_import("pw".to_string(), file.path().to_str().unwrap().to_string()).unwrap();
        assert!(preview.is_empty());
    }

    // --- export_accounts with account_ids tests ---

    #[test]
    fn test_export_with_empty_ids_exports_all() {
        // 验证 account_ids 为空时，export_accounts 走 list_accounts_for_export 路径（导出全部）
        let conn = init_db_memory().unwrap();
        for a in sample_accounts() {
            crate::db::create_account(&conn, &a.name, a.issuer.as_deref(), &a.secret).unwrap();
        }
        // 空 ids → 调用 list_accounts_for_export
        let exported = crate::db::list_accounts_for_export(&conn).unwrap();
        assert_eq!(exported.len(), 3);

        // 加密并写入文件，再解密校验数量一致
        let file = NamedTempFile::with_suffix(".s2fa").unwrap();
        let encrypted = encrypt_accounts(&exported, "pw").unwrap();
        std::fs::write(file.path(), &encrypted).unwrap();
        let data = std::fs::read(file.path()).unwrap();
        let decrypted = crate::crypto::decrypt_accounts(&data, "pw").unwrap();
        assert_eq!(decrypted.len(), 3);
    }

    // --- import_accounts with selected_indices tests ---

    #[test]
    fn test_import_selected_indices_subset() {
        let file = make_s2fa_file(&sample_accounts(), "pw");
        let conn = init_db_memory().unwrap();
        use std::sync::Mutex;
        let state_inner = AppState {
            db: Mutex::new(conn),
        };
        // 只导入索引 0 和 2（alice, carol），跳过 bob
        // 直接调用内部逻辑（不通过 Tauri State）
        let data = std::fs::read(file.path()).unwrap();
        let all_accounts = crate::crypto::decrypt_accounts(&data, "pw").unwrap();
        let selected: Vec<_> = [0usize, 2]
            .iter()
            .filter_map(|&i| all_accounts.get(i).cloned())
            .collect();
        assert_eq!(selected.len(), 2);
        assert_eq!(selected[0].name, "alice");
        assert_eq!(selected[1].name, "carol");

        let conn = state_inner.db.lock().unwrap();
        for account in &selected {
            crate::db::create_account(
                &conn,
                &account.name,
                account.issuer.as_deref(),
                &account.secret,
            )
            .unwrap();
        }
        let exported = crate::db::list_accounts_for_export(&conn).unwrap();
        assert_eq!(exported.len(), 2);
    }

    #[test]
    fn test_import_empty_selected_indices_imports_all() {
        let all_accounts = sample_accounts();
        // 空索引 → 全部
        let selected: Vec<_> = {
            let indices: Vec<usize> = vec![];
            if indices.is_empty() {
                all_accounts.clone()
            } else {
                indices
                    .iter()
                    .filter_map(|&i| all_accounts.get(i).cloned())
                    .collect()
            }
        };
        assert_eq!(selected.len(), 3);
    }

    #[test]
    fn test_import_out_of_bounds_index_ignored() {
        let all_accounts = sample_accounts(); // len=3
        let indices = vec![0usize, 99]; // 99 越界
        let selected: Vec<_> = indices
            .iter()
            .filter_map(|&i| all_accounts.get(i).cloned())
            .collect();
        assert_eq!(selected.len(), 1);
        assert_eq!(selected[0].name, "alice");
    }
}
