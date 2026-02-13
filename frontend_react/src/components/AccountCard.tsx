import { useEffect, useMemo, useState } from 'react';
import { Account } from '../types';
import { Card, CardContent, Typography, LinearProgress, IconButton, Box, Tooltip } from '@mui/material';
import { ContentCopy, Delete, Edit } from '@mui/icons-material';
import { getTotpState } from '../utils/totp';

interface AccountCardProps {
    account: Account;
    onDelete: (account: Account) => void;
    onEdit: (account: Account) => void;
}

export default function AccountCard({ account, onDelete, onEdit }: AccountCardProps) {
    const { name, issuer, secret } = account;
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const totp = useMemo(() => getTotpState(secret, now), [secret, now]);

    const ttl = totp?.ttl ?? 0;
    const period = totp?.period ?? 30;
    const progress = (ttl / period) * 100;
    const isDanger = ttl < 5;
    const code = totp?.code ?? '------';

    const handleCopy = () => {
        const rawCode = code.replace(/ /g, '');
        navigator.clipboard.writeText(rawCode);
    };

    return (
        <Card sx={{ mb: 2, display: 'flex', flexDirection: 'column' }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h6" component="div">
                            {issuer || 'Unknown'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {name}
                        </Typography>
                    </Box>
                    <Box textAlign="right">
                        <Typography variant="h4" color={isDanger ? 'error' : 'primary'} sx={{ fontFamily: 'monospace', letterSpacing: 2, fontWeight: 'bold' }}>
                            {code}
                            <Tooltip title="Copy Code">
                                <IconButton onClick={handleCopy} size="small" sx={{ ml: 1 }}>
                                    <ContentCopy fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Typography>
                    </Box>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    color={isDanger ? 'error' : 'primary'}
                    sx={{ mt: 2, height: 8, borderRadius: 4 }}
                />
                <Box display="flex" justifyContent="flex-end" mt={1} gap={1}>
                    <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(account)}>
                            <Edit fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => onDelete(account)}>
                            <Delete fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </CardContent>
        </Card>
    );
}
