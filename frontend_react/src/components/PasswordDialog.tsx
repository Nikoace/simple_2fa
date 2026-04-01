import { useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface PasswordDialogProps {
    readonly mode: 'export' | 'import';
    readonly open: boolean;
    readonly onConfirm: (password: string) => void;
    readonly onClose: () => void;
}

export default function PasswordDialog({ mode, open: isOpen, onConfirm, onClose }: PasswordDialogProps) {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const resetLocalState = () => {
        setPassword('');
        setConfirmPassword('');
        setError('');
    };

    const handleClose = () => {
        resetLocalState();
        onClose();
    };

    const handleConfirm = () => {
        if (!password) {
            setError(t('passwordDialog.errors.required'));
            return;
        }
        if (mode === 'export' && password !== confirmPassword) {
            setError(t('passwordDialog.errors.mismatch'));
            return;
        }
        // 不在这里调用 onClose()，让父组件控制对话框生命周期
        // 避免 import 流程中 resetImportState 提前清除 pendingImportPath
        resetLocalState();
        onConfirm(password);
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>{mode === 'export' ? t('passwordDialog.titleExport') : t('passwordDialog.titleImport')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                    label={t('passwordDialog.passwordLabel')}
                    type="password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                    }}
                    error={!!error}
                    helperText={error || (mode === 'export' ? t('passwordDialog.helperExport') : t('passwordDialog.helperImport'))}
                    autoFocus
                    fullWidth
                />
                {mode === 'export' && (
                    <TextField
                        label={t('passwordDialog.confirmPasswordLabel')}
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        fullWidth
                    />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{t('passwordDialog.cancel')}</Button>
                <Button onClick={handleConfirm} variant="contained">
                    {mode === 'export' ? t('passwordDialog.next') : t('passwordDialog.decrypt')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
