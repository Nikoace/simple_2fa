use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

use crate::db;

/// Application state holding the database connection.
pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
}

/// Serializable response for account with TOTP code (sent to frontend).
#[derive(Serialize)]
pub struct AccountWithCodeResponse {
    pub id: i64,
    pub name: String,
    pub issuer: Option<String>,
    pub code: String,
    pub ttl: u64,
}

/// Serializable response for account (create/update response).
#[derive(Serialize)]
pub struct AccountReadResponse {
    pub id: i64,
    pub name: String,
    pub issuer: Option<String>,
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
pub fn get_accounts(state: State<'_, AppState>) -> Result<Vec<AccountWithCodeResponse>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let accounts = db::list_accounts_with_codes(&conn).map_err(|e| e.to_string())?;

    Ok(accounts
        .into_iter()
        .map(|a| AccountWithCodeResponse {
            id: a.id,
            name: a.name,
            issuer: a.issuer,
            code: a.code,
            ttl: a.ttl,
        })
        .collect())
}

/// Add a new account.
#[tauri::command]
pub fn add_account(
    state: State<'_, AppState>,
    input: CreateAccountInput,
) -> Result<AccountReadResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let account = db::create_account(&conn, &input.name, input.issuer.as_deref(), &input.secret)
        .map_err(|e| e.to_string())?;

    Ok(AccountReadResponse {
        id: account.id,
        name: account.name,
        issuer: account.issuer,
    })
}

/// Update an existing account.
#[tauri::command]
pub fn update_account(
    state: State<'_, AppState>,
    id: i64,
    input: UpdateAccountInput,
) -> Result<AccountReadResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let account = db::update_account(
        &conn,
        id,
        input.name.as_deref(),
        input.issuer.as_deref(),
        input.secret.as_deref(),
    )
    .map_err(|e| e.to_string())?;

    Ok(AccountReadResponse {
        id: account.id,
        name: account.name,
        issuer: account.issuer,
    })
}

/// Delete an account by ID.
#[tauri::command]
pub fn delete_account(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::delete_account(&conn, id).map_err(|e| e.to_string())
}
