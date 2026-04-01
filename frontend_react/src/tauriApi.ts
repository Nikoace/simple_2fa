import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import type { Account, DuplicateStrategy, ImportPreviewAccount, ImportResult } from './types';
export type { ImportPreviewAccount } from './types';

/** Account data returned after create/update (no code or secret). */
export interface AccountRead {
    id: number;
    name: string;
    issuer: string | null;
}

/** Input for creating a new account. */
interface CreateAccountInput {
    name: string;
    issuer: string | null;
    secret: string;
}

/** Input for updating an account. */
interface UpdateAccountInput {
    name: string | null;
    issuer: string | null;
    secret: string | null;
}

/** Get all accounts with their current TOTP codes. */
export async function getAccounts(): Promise<Account[]> {
    return invoke<Account[]>('get_accounts');
}

/** Add a new account. */
export async function addAccount(
    name: string,
    issuer: string,
    secret: string
): Promise<AccountRead> {
    const input: CreateAccountInput = { name, issuer: issuer || null, secret };
    return invoke<AccountRead>('add_account', { input });
}

/** Update an existing account. */
export async function updateAccount(
    id: number,
    name?: string,
    issuer?: string,
    secret?: string
): Promise<AccountRead> {
    const input: UpdateAccountInput = {
        name: name ?? null,
        issuer: issuer ?? null,
        secret: secret ?? null,
    };
    return invoke<AccountRead>('update_account', { id, input });
}

/** Delete an account by ID. */
export async function deleteAccount(id: number): Promise<void> {
    return invoke<void>('delete_account', { id });
}

/** 导出指定账户到加密文件（accountIds 为空时导出全部），返回导出数量 */
export async function exportAccounts(
    password: string,
    filePath: string,
    accountIds: number[]
): Promise<number> {
    return invoke<number>('export_accounts', { password, filePath, accountIds });
}

/** 解密备份文件，返回账户预览列表（不含密钥） */
export async function previewImport(
    password: string,
    filePath: string
): Promise<ImportPreviewAccount[]> {
    return invoke<ImportPreviewAccount[]>('preview_import', { password, filePath });
}

/** 从加密文件导入指定账户（selectedIndices 为空时导入全部） */
export async function importAccounts(
    password: string,
    filePath: string,
    duplicateStrategy: DuplicateStrategy,
    selectedIndices: number[]
): Promise<ImportResult> {
    return invoke<ImportResult>('import_accounts', {
        password,
        filePath,
        duplicateStrategy,
        selectedIndices,
    });
}

/** 打开文件保存对话框，返回选择的路径或 null */
export async function pickExportPath(): Promise<string | null> {
    return save({
        filters: [{ name: '2FA 备份', extensions: ['s2fa'] }],
        defaultPath: 'simple_2fa_backup.s2fa',
    });
}

/** 打开文件选择对话框，返回选择的路径或 null */
export async function pickImportPath(): Promise<string | null> {
    const result = await open({
        filters: [{ name: '2FA 备份', extensions: ['s2fa'] }],
        multiple: false,
    });
    return typeof result === 'string' ? result : null;
}
