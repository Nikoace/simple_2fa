import * as OTPAuth from 'otpauth';
import { Account } from '../types';

const STORAGE_KEY = 'simple-2fa:accounts';
const DEFAULT_PERIOD = 30;

interface StoredAccount {
    id: number;
    name: string;
    issuer: string;
    secret: string;
}

export interface AccountPayload {
    name: string;
    issuer: string;
    secret?: string;
}

export class AccountStoreError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AccountStoreError';
    }
}

const assertStorageAvailable = () => {
    if (typeof window === 'undefined' || !window.localStorage) {
        throw new AccountStoreError('Local storage is not available.');
    }
};

const normalizeError = (error: unknown, fallback: string): never => {
    if (error instanceof AccountStoreError) {
        throw error;
    }

    if (error instanceof Error) {
        throw new AccountStoreError(error.message || fallback);
    }

    throw new AccountStoreError(fallback);
};

const readStoredAccounts = (): StoredAccount[] => {
    try {
        assertStorageAvailable();
        const raw = window.localStorage.getItem(STORAGE_KEY);

        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            throw new AccountStoreError('Stored account data is invalid.');
        }

        return parsed;
    } catch (error: unknown) {
        normalizeError(error, 'Failed to read account data.');
    }
};

const persistStoredAccounts = (accounts: StoredAccount[]) => {
    try {
        assertStorageAvailable();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (error: unknown) {
        normalizeError(error, 'Failed to save account data.');
    }
};

const toUiAccount = (account: StoredAccount): Account => {
    try {
        const totp = new OTPAuth.TOTP({
            issuer: account.issuer,
            label: account.name,
            algorithm: 'SHA1',
            digits: 6,
            period: DEFAULT_PERIOD,
            secret: OTPAuth.Secret.fromBase32(account.secret)
        });

        const now = Date.now();
        const ttl = totp.period - Math.floor((now / 1000) % totp.period);

        return {
            id: account.id,
            name: account.name,
            issuer: account.issuer,
            code: totp.generate(),
            ttl
        };
    } catch {
        throw new AccountStoreError(`Invalid secret for account "${account.name}".`);
    }
};

const normalizeBase32 = (value: string) => value.replace(/\s+/g, '').toUpperCase();

const ensureRequiredFields = (payload: AccountPayload, requireSecret = true) => {
    if (!payload.name.trim()) {
        throw new AccountStoreError('Name is required.');
    }

    if (requireSecret && !payload.secret?.trim()) {
        throw new AccountStoreError('Secret is required.');
    }
};

export const listAccounts = async (): Promise<Account[]> => {
    try {
        const accounts = readStoredAccounts();
        return accounts.map(toUiAccount);
    } catch (error: unknown) {
        normalizeError(error, 'Failed to list accounts.');
    }
};

export const createAccount = async (payload: AccountPayload): Promise<Account> => {
    try {
        ensureRequiredFields(payload);

        const accounts = readStoredAccounts();
        const nextId = accounts.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
        const entry: StoredAccount = {
            id: nextId,
            name: payload.name.trim(),
            issuer: payload.issuer.trim(),
            secret: normalizeBase32(payload.secret!)
        };

        // validate secret before persisting
        toUiAccount(entry);

        const updated = [...accounts, entry];
        persistStoredAccounts(updated);

        return toUiAccount(entry);
    } catch (error: unknown) {
        normalizeError(error, 'Failed to create account.');
    }
};

export const updateAccount = async (id: number, payload: AccountPayload): Promise<Account> => {
    try {
        ensureRequiredFields(payload, false);

        const accounts = readStoredAccounts();
        const index = accounts.findIndex((item) => item.id === id);

        if (index < 0) {
            throw new AccountStoreError('Account not found.');
        }

        const current = accounts[index];
        const updatedEntry: StoredAccount = {
            ...current,
            name: payload.name.trim(),
            issuer: payload.issuer.trim(),
            secret: payload.secret?.trim() ? normalizeBase32(payload.secret) : current.secret
        };

        toUiAccount(updatedEntry);

        const next = [...accounts];
        next[index] = updatedEntry;
        persistStoredAccounts(next);

        return toUiAccount(updatedEntry);
    } catch (error: unknown) {
        normalizeError(error, 'Failed to update account.');
    }
};

export const deleteAccount = async (id: number): Promise<void> => {
    try {
        const accounts = readStoredAccounts();
        const next = accounts.filter((item) => item.id !== id);

        if (next.length === accounts.length) {
            throw new AccountStoreError('Account not found.');
        }

        persistStoredAccounts(next);
    } catch (error: unknown) {
        normalizeError(error, 'Failed to delete account.');
    }
};

export const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof AccountStoreError) {
        return error.message;
    }

    return fallback;
};
