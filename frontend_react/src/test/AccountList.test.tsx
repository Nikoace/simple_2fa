import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccountList from '../components/AccountList';

describe('AccountList', () => {
    const mockOnDelete = () => { };
    const mockOnEdit = () => { };
    const mockOnRefresh = () => { };

    it('should show empty message when no accounts', () => {
        render(
            <AccountList accounts={[]} onDelete={mockOnDelete} onEdit={mockOnEdit} onRefresh={mockOnRefresh} />
        );
        expect(screen.getByText('No accounts yet. Add one!')).toBeInTheDocument();
    });

    it('should render multiple account cards', () => {
        const accounts = [
            { id: 1, name: 'user1@test.com', issuer: 'GitHub', code: '123456', ttl: 20 },
            { id: 2, name: 'user2@test.com', issuer: 'Gmail', code: '654321', ttl: 15 },
        ];
        render(
            <AccountList accounts={accounts} onDelete={mockOnDelete} onEdit={mockOnEdit} onRefresh={mockOnRefresh} />
        );
        expect(screen.getByText('GitHub')).toBeInTheDocument();
        expect(screen.getByText('Gmail')).toBeInTheDocument();
        expect(screen.getByText('123456')).toBeInTheDocument();
        expect(screen.getByText('654321')).toBeInTheDocument();
    });

    it('should render correct number of cards', () => {
        const accounts = [
            { id: 1, name: 'a', issuer: 'A', code: '111111', ttl: 30 },
            { id: 2, name: 'b', issuer: 'B', code: '222222', ttl: 30 },
            { id: 3, name: 'c', issuer: 'C', code: '333333', ttl: 30 },
        ];
        render(
            <AccountList accounts={accounts} onDelete={mockOnDelete} onEdit={mockOnEdit} onRefresh={mockOnRefresh} />
        );
        // Each card has a progressbar
        const progressBars = screen.getAllByRole('progressbar');
        expect(progressBars).toHaveLength(3);
    });
});
