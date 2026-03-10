import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAccounts, addAccount, updateAccount, deleteAccount } from '../tauriApi';

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = vi.mocked(invoke);

describe('tauriApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAccounts', () => {
        it('should invoke get_accounts command', async () => {
            const mockAccounts = [
                { id: 1, name: 'GitHub', issuer: 'GitHub', code: '123456', ttl: 25 },
            ];
            mockInvoke.mockResolvedValue(mockAccounts);

            const result = await getAccounts();

            expect(mockInvoke).toHaveBeenCalledWith('get_accounts');
            expect(result).toEqual(mockAccounts);
        });

        it('should return empty array when no accounts', async () => {
            mockInvoke.mockResolvedValue([]);

            const result = await getAccounts();

            expect(result).toEqual([]);
        });

        it('should propagate errors', async () => {
            mockInvoke.mockRejectedValue('Database error');

            await expect(getAccounts()).rejects.toBe('Database error');
        });
    });

    describe('addAccount', () => {
        it('should invoke add_account with correct input', async () => {
            const mockResult = { id: 1, name: 'GitHub', issuer: 'GitHub' };
            mockInvoke.mockResolvedValue(mockResult);

            const result = await addAccount('GitHub', 'GitHub', 'SECRET123');

            expect(mockInvoke).toHaveBeenCalledWith('add_account', {
                input: { name: 'GitHub', issuer: 'GitHub', secret: 'SECRET123' },
            });
            expect(result).toEqual(mockResult);
        });

        it('should handle empty issuer as null', async () => {
            mockInvoke.mockResolvedValue({ id: 1, name: 'Test', issuer: null });

            await addAccount('Test', '', 'SECRET');

            expect(mockInvoke).toHaveBeenCalledWith('add_account', {
                input: { name: 'Test', issuer: null, secret: 'SECRET' },
            });
        });

        it('should propagate validation errors', async () => {
            mockInvoke.mockRejectedValue('Invalid secret');

            await expect(addAccount('Test', 'Corp', 'bad')).rejects.toBe('Invalid secret');
        });
    });

    describe('updateAccount', () => {
        it('should invoke update_account with all fields', async () => {
            const mockResult = { id: 1, name: 'New Name', issuer: 'New Issuer' };
            mockInvoke.mockResolvedValue(mockResult);

            const result = await updateAccount(1, 'New Name', 'New Issuer', 'NEWSECRET');

            expect(mockInvoke).toHaveBeenCalledWith('update_account', {
                id: 1,
                input: { name: 'New Name', issuer: 'New Issuer', secret: 'NEWSECRET' },
            });
            expect(result).toEqual(mockResult);
        });

        it('should send null for undefined optional fields', async () => {
            mockInvoke.mockResolvedValue({ id: 1, name: 'Name', issuer: null });

            await updateAccount(1, 'Name');

            expect(mockInvoke).toHaveBeenCalledWith('update_account', {
                id: 1,
                input: { name: 'Name', issuer: null, secret: null },
            });
        });

        it('should propagate not-found errors', async () => {
            mockInvoke.mockRejectedValue('Account not found: id=999');

            await expect(updateAccount(999, 'Name')).rejects.toBe('Account not found: id=999');
        });
    });

    describe('deleteAccount', () => {
        it('should invoke delete_account with id', async () => {
            mockInvoke.mockResolvedValue(undefined);

            await deleteAccount(1);

            expect(mockInvoke).toHaveBeenCalledWith('delete_account', { id: 1 });
        });

        it('should propagate not-found errors', async () => {
            mockInvoke.mockRejectedValue('Account not found: id=999');

            await expect(deleteAccount(999)).rejects.toBe('Account not found: id=999');
        });
    });
});
