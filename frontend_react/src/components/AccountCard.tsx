import { useEffect, useRef, useState } from 'react';
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
    // 自增计数器：仅用作扩散圈的 key，值变化即重挂载元素，让 CSS 动画重新播放
    const [pulse, setPulse] = useState(0);
    const refreshPendingRef = useRef(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    return 0;
                }

                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (timeLeft === 0 && !refreshPendingRef.current) {
            refreshPendingRef.current = true;
            onRefresh();
        }
    }, [onRefresh, timeLeft]);

    const progress = (timeLeft / 30) * 100;
    const isDanger = timeLeft < 5;

    const handleCopy = () => {
        const rawCode = code.replace(/ /g, '');
        // 特效表示「复制成功」，因此等写入 resolve 后再触发
        navigator.clipboard.writeText(rawCode).then(() => setPulse((n) => n + 1));
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
                                <IconButton aria-label={t('accountCard.copyCode')} onClick={handleCopy} size="small" sx={{ ml: 1, position: 'relative' }}>
                                    <ContentCopy fontSize="small" />
                                    {pulse > 0 && (
                                        <Box
                                            key={pulse}
                                            data-testid="copy-pulse"
                                            sx={{
                                                position: 'absolute',
                                                inset: 0,
                                                borderRadius: '50%',
                                                border: '2px solid',
                                                borderColor: 'success.main',
                                                pointerEvents: 'none',
                                                animation: 'copyPulse 600ms ease-out forwards',
                                                '@keyframes copyPulse': {
                                                    from: { transform: 'scale(1)', opacity: 0.8 },
                                                    to: { transform: 'scale(2.6)', opacity: 0 },
                                                },
                                            }}
                                        />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </Typography>
                    </Box>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    color={isDanger ? 'error' : 'primary'}
                    sx={{
                        mt: 2,
                        height: 8,
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                            transition: 'transform 1s linear',
                        },
                    }}
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
