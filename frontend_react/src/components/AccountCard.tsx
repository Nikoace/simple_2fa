import { useEffect, useState } from 'react';
import { Account } from '../types';
import { Card, CardContent, Typography, LinearProgress, IconButton, Box, Tooltip } from '@mui/material';
import { ContentCopy, Delete, Edit } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface AccountCardProps {
    readonly account: Account;
    readonly onDelete: (account: Account) => void;
    readonly onEdit: (account: Account) => void;
    readonly onRefresh: () => void;
}

export default function AccountCard({ account, onDelete, onEdit, onRefresh }: AccountCardProps) {
    const { t } = useTranslation();
    const { name, issuer, code, ttl } = account;
    const [timeLeft, setTimeLeft] = useState(ttl);
    const [progress, setProgress] = useState(0);
    const [isDanger, setIsDanger] = useState(false);

    useEffect(() => {
        setTimeLeft(ttl);
    }, [ttl]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // 验证码过期，立即触发刷新获取新 code
                    onRefresh();
                    return 30; // 先用 30 保持进度条连贯，实际值会被 ttl 更新覆盖
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onRefresh]);

    useEffect(() => {
        const period = 30;
        const newProgress = (timeLeft / period) * 100;
        setProgress(newProgress);
        setIsDanger(timeLeft < 5);
    }, [timeLeft]);

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
                            {issuer || t('accountCard.unknownIssuer')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {name}
                        </Typography>
                    </Box>
                    <Box textAlign="right">
                        <Typography variant="h4" color={isDanger ? 'error' : 'primary'} sx={{ fontFamily: '"JetBrains Mono", monospace', letterSpacing: 2, fontWeight: 'bold' }}>
                            {code}
                            <Tooltip title={t('accountCard.copyCode')}>
                                <IconButton aria-label={t('accountCard.copyCode')} onClick={handleCopy} size="small" sx={{ ml: 1 }}>
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
                    <Tooltip title={t('accountCard.edit')}>
                        <IconButton aria-label={t('accountCard.edit')} size="small" onClick={() => onEdit(account)}>
                            <Edit fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('accountCard.delete')}>
                        <IconButton aria-label={t('accountCard.delete')} size="small" color="error" onClick={() => onDelete(account)}>
                            <Delete fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </CardContent>
        </Card>
    );
}
