import { Account } from '../types';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import AccountCard from './AccountCard';

interface AccountListProps {
    readonly accounts: Account[];
    readonly onDelete: (account: Account) => void;
    readonly onEdit: (account: Account) => void;
    readonly onRefresh: () => void;
}

export default function AccountList({ accounts, onDelete, onEdit, onRefresh }: AccountListProps) {
    const { t } = useTranslation();

    if (!accounts || accounts.length === 0) {
        return (
            <Box textAlign="center" py={5}>
                <Typography variant="h6" color="text.secondary">
                    {t('accountList.empty')}
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {accounts.map((account) => (
                <AccountCard
                    key={`${account.id}-${account.code}`}
                    account={account}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onRefresh={onRefresh}
                />
            ))}
        </Box>
    );
}
