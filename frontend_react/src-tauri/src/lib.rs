mod commands;
mod crypto;
mod db;
mod totp;

use commands::AppState;
use rand::{rngs::OsRng, RngCore};
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;

const KEYRING_SERVICE: &str = "com.nikoace.simple-2fa";
const KEYRING_KEY_NAME: &str = "db-encryption-key";

/// 从 OS keyring 取出数据库加密密钥；不存在则生成随机 32 字节并存入。
/// keyring 不可用时：debug 构建回退到固定 dev 密钥，release 构建直接失败。
fn get_or_create_db_key() -> Result<[u8; 32], Box<dyn std::error::Error>> {
    match keyring_db_key() {
        Ok(key) => Ok(key),
        Err(e) => dev_key_fallback(e),
    }
}

/// 密钥以十六进制字符串形式存储（keyring 的 password 接口）。
fn keyring_db_key() -> Result<[u8; 32], Box<dyn std::error::Error>> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_KEY_NAME)?;
    match entry.get_password() {
        Ok(hex) => hex_decode_32(&hex).ok_or_else(|| "keyring 中的密钥格式无效".into()),
        Err(keyring::Error::NoEntry) => {
            let mut key = [0u8; 32];
            OsRng.fill_bytes(&mut key);
            let hex: String = key.iter().map(|b| format!("{:02x}", b)).collect();
            entry.set_password(&hex)?;
            Ok(key)
        }
        Err(e) => Err(Box::new(e)),
    }
}

/// debug 构建：keyring 不可用（如 WSL 无 secret-service）时用固定 dev 密钥，
/// 让 `tauri dev` 能跑起来。绝不用于 release。
#[cfg(debug_assertions)]
fn dev_key_fallback(e: Box<dyn std::error::Error>) -> Result<[u8; 32], Box<dyn std::error::Error>> {
    log::warn!("keyring 不可用（{e}），回退到固定 dev 密钥——仅限 debug 构建，切勿用于生产");
    Ok([0x2a; 32])
}

/// release 构建：keyring 是唯一密钥来源，不可用即失败，绝不弱化到固定密钥。
#[cfg(not(debug_assertions))]
fn dev_key_fallback(e: Box<dyn std::error::Error>) -> Result<[u8; 32], Box<dyn std::error::Error>> {
    Err(e)
}

/// 将 64 字符十六进制串解析为 32 字节，失败返回 None
fn hex_decode_32(hex: &str) -> Option<[u8; 32]> {
    if hex.len() != 64 {
        return None;
    }
    let mut out = [0u8; 32];
    for (i, byte) in out.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).ok()?;
    }
    Some(out)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Set up logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize database in app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");

            let db_path = app_data_dir.join("accounts.db");
            let db_key =
                get_or_create_db_key().expect("Failed to obtain DB encryption key from keyring");
            let conn =
                db::init_db(&db_path, &db_key).expect("Failed to initialize encrypted database");

            app.manage(AppState {
                db: Mutex::new(conn),
            });

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_accounts,
            commands::add_account,
            commands::update_account,
            commands::delete_account,
            commands::export_accounts,
            commands::preview_import,
            commands::import_accounts
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
