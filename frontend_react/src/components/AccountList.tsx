import { Account } from '../types';
import { Box, Typography } from '@mui/material';
import AccountCard from './AccountCard';

interface AccountListProps {
    accounts: Account[];
    onDelete: (account: Account) => void;
    onEdit: (account: Account) => void;
}

export default function AccountList({ accounts, onDelete, onEdit }: AccountListProps) {
    if (!accounts || accounts.length === 0) {
        return (
            <Box textAlign="center" py={5}>
                <Typography variant="h6" color="text.secondary">
                    No accounts yet. Add one!
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {accounts.map((account) => (
                <AccountCard
                    key={account.id}
                    account={account}
                    onDelete={onDelete}
                    onEdit={onEdit}
                />
            ))}
        </Box>
    );
}
