import { invoke } from '@tauri-apps/api/core';
import { Account } from './types';

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
