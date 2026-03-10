import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccountCard from '../components/AccountCard';

// Mock clipboard API
Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

describe('AccountCard', () => {
    const mockAccount = {
        id: 1,
        name: 'user@example.com',
        issuer: 'GitHub',
        code: '123456',
        ttl: 25,
    };

    const mockOnDelete = vi.fn();
    const mockOnEdit = vi.fn();
    const mockOnRefresh = vi.fn();

    it('should render issuer name', () => {
        render(
            <AccountCard account={mockAccount} onDelete={mockOnDelete} onEdit={mockOnEdit} onRefresh={mockOnRefresh} />
        );
        expect(screen.getByText('GitHub')).toBeInTheDocument();
    });

    it('should render account name', () => {
        render(
            <AccountCard account={mockAccount} onDelete={mockOnDelete} onEdit={mockOnEdit} onRefresh={mockOnRefresh} />
        );
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('should render TOTP code', () => {
        render(
            <AccountCard account={mockAccount} onDelete={mockOnDelete} onEdit={mockOnEdit} onRefresh={mockOnRefresh} />
        );
        expect(screen.getByText('123456')).toBeInTheDocument();
    });

    it('should show "Unknown" when issuer is empty', () => {
        const noIssuer = { ...mockAccount, issuer: '' };
        render(
            <AccountCard account={noIssuer} onDelete={mockOnDelete} onEdit={mockOnEdit} onRefresh={mockOnRefresh} />
        );
        expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should render progress bar', () => {
        render(
            <AccountCard account={mockAccount} onDelete={mockOnDelete} onEdit={mockOnEdit} onRefresh={mockOnRefresh} />
        );
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render edit and delete buttons', () => {
        render(
            <AccountCard account={mockAccount} onDelete={mockOnDelete} onEdit={mockOnEdit} onRefresh={mockOnRefresh} />
        );
        expect(screen.getByLabelText('Edit')).toBeInTheDocument();
        expect(screen.getByLabelText('Delete')).toBeInTheDocument();
    });
});
