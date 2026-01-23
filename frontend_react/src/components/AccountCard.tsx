import { useEffect, useState, useRef } from 'react';
import { Account } from '../types';
import { Card, CardContent, Typography, LinearProgress, IconButton, Box, Tooltip } from '@mui/material';
import { ContentCopy, Delete, Edit } from '@mui/icons-material';
import * as OTPAuth from 'otpauth';

interface AccountCardProps {
    account: Account;
    onDelete: (account: Account) => void;
    onEdit: (account: Account) => void;
}

export default function AccountCard({ account, onDelete, onEdit }: AccountCardProps) {
    const { name, issuer, secret } = account;
    const [code, setCode] = useState('--- ---');
    const [progress, setProgress] = useState(0);
    const [isDanger, setIsDanger] = useState(false);

    // Create TOTP object
    // We memoize it or just recreate it since secret doesn't change often
    const totp = new OTPAuth.TOTP({
        issuer: issuer || 'Unknown',
        label: name,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
    });

    useEffect(() => {
        let frameId: number;

        const update = () => {
            const now = Date.now() / 1000;
            const period = 30;
            const remaining = period - (now % period);

            // Update progress
            const newProgress = (remaining / period) * 100;
            setProgress(newProgress);
            setIsDanger(remaining < 5);

            // Update code if needed (or just every frame to be safe/simple)
            const newCode = totp.generate();
            const formatted = newCode.match(/.{1,3}/g)?.join(' ') || '--- ---';
            setCode(formatted);

            frameId = requestAnimationFrame(update);
        };

        update();
        return () => cancelAnimationFrame(frameId);
    }, [secret]); // Re-run if secret changes

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
