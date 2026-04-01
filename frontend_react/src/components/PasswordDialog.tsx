import { useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material';

interface PasswordDialogProps {
    mode: 'export' | 'import';
    open: boolean;
    onConfirm: (password: string) => void;
    onClose: () => void;
}

export default function PasswordDialog({ mode, open: isOpen, onConfirm, onClose }: PasswordDialogProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleClose = () => {
        setPassword('');
        setConfirmPassword('');
        setError('');
        onClose();
    };

    const handleConfirm = () => {
        if (!password) {
            setError('请输入密码');
            return;
        }
        if (mode === 'export' && password !== confirmPassword) {
            setError('两次密码输入不一致');
            return;
        }
        onConfirm(password);
        handleClose();
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>{mode === 'export' ? '导出备份' : '导入备份'}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                    label="加密密码"
                    type="password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                    }}
                    error={!!error}
                    helperText={error || (mode === 'export' ? '请设置备份文件的加密密码' : '请输入备份文件的加密密码')}
                    autoFocus
                    fullWidth
                />
                {mode === 'export' && (
                    <TextField
                        label="确认密码"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        fullWidth
                    />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>取消</Button>
                <Button onClick={handleConfirm} variant="contained">
                    {mode === 'export' ? '下一步' : '解密'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
