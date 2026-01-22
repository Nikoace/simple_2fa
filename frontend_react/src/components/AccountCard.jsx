import React from 'react';
import { Card, CardContent, Typography, LinearProgress, IconButton, Box, Tooltip } from '@mui/material';
import { ContentCopy, Delete, Edit } from '@mui/icons-material';

export default function AccountCard({ account, onDelete, onEdit }) {
    const { name, issuer, code, ttl } = account;

    // Calculate progress (assuming 30s max, though some might differ, standard is 30)
    const progress = (ttl / 30) * 100;
    const isDanger = ttl < 5;

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
    };

    // Format code with space
    const formattedCode = code ? code.match(/.{1,3}/g).join(' ') : '--- ---';

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
                            {formattedCode}
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
