import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Tabs, Tab, Box, TextField, Button, DialogActions, Typography, Alert, CircularProgress } from '@mui/material';
import jsQR from 'jsqr';
import { useTranslation } from 'react-i18next';
import { Account } from '../types';
import { addAccount, updateAccount } from '../tauriApi';

interface AddAccountModalProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onAccountAdded: () => void;
    readonly initialData: Account | null;
}

interface AccountForm {
    name: string;
    issuer: string;
    secret: string;
}

export default function AddAccountModal({ open, onClose, onAccountAdded, initialData }: AddAccountModalProps) {
    const { t } = useTranslation();
    const [tab, setTab] = useState(0); // 0 = Scan, 1 = Manual
    const [form, setForm] = useState<AccountForm>({ name: '', issuer: '', secret: '' });
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name || '',
                issuer: initialData.issuer || '',
                secret: '' // Secret is not returned by API for security
            });
            setTab(1); // Force Manual tab for editing
            setStatus('');
            setError('');
        } else {
            setForm({ name: '', issuer: '', secret: '' });
            setTab(0); // Default to scan
        }
    }, [initialData, open]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
        setError('');
        setStatus('');
    };

    const handleStartCapture = async () => {
        setError('');
        setStatus(t('addModal.statusSelectScreen'));
        setScanning(true);

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                video: { cursor: "never" } as any
            });

            const track = stream.getVideoTracks()[0];

            // Wait for stream to be active
            await new Promise(r => setTimeout(r, 500));

            let foundCode: string | null = null;

            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            // Wait for video to have dimensions
            await new Promise<void>(resolve => {
                video.onloadedmetadata = () => resolve();
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                setError(t('addModal.errors.canvas'));
                return;
            }

            for (let i = 0; i < 20; i++) { // Try for a few seconds
                if (foundCode) break;

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    foundCode = code.data;
                    break;
                }

                await new Promise(r => setTimeout(r, 200));
            }

            // Stop tracks
            track.stop();
            stream.getTracks().forEach(t => t.stop());

            if (foundCode) {
                handleQrFound(foundCode);
            } else {
                setError(t('addModal.errors.noQr'));
            }

        } catch (err: unknown) {
            console.error(err);
            setError(t('addModal.errors.captureFailed', { message: err instanceof Error ? err.message : String(err) }));
        } finally {
            setScanning(false);
            setStatus('');
        }
    };

    const handleQrFound = (data: string) => {
        try {
            if (!data.startsWith('otpauth://')) {
                throw new Error(t('addModal.errors.invalidOtpUrl'));
            }
            const url = new URL(data);
            const params = new URLSearchParams(url.search);
            const secret = params.get('secret');
            const issuer = params.get('issuer') || '';
            const pathname = decodeURIComponent(url.pathname);
            // Clean up name
            const name = pathname.split(':').pop() || pathname.replace('/', '');

            if (!secret) throw new Error(t('addModal.errors.noSecret'));

            setForm({ name, issuer, secret });
            setTab(1); // Switch to manual tab for editing
            setStatus(t('addModal.statusQrScanned'));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    const handleSubmit = async () => {
        // Validation: Secret is required for new accounts, but optional for updates (if unchanged)
        if (!form.name || (!initialData && !form.secret)) {
            setError(t('addModal.errors.nameSecretRequired'));
            return;
        }

        try {
            if (initialData?.id) {
                // Update existing account via Tauri invoke
                await updateAccount(
                    initialData.id,
                    form.name,
                    form.issuer,
                    form.secret || undefined
                );
            } else {
                // Create new account via Tauri invoke
                await addAccount(form.name, form.issuer, form.secret);
            }
            onAccountAdded();
            handleClose();
        } catch (error) {
            setError(String(error));
        }
    };

    const handleClose = () => {
        if (!initialData) {
            setForm({ name: '', issuer: '', secret: '' });
            setTab(0);
        }
        setError('');
        setStatus('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>{initialData ? t('addModal.titleEdit') : t('addModal.titleAdd')}</DialogTitle>
            <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
                <Tab label={initialData ? t('addModal.tabEditDetails') : t('addModal.tabScan')} disabled={!!initialData && tab === 1} />
                <Tab label={t('addModal.tabManual')} />
            </Tabs>
            <DialogContent sx={{ mt: 2, minHeight: 200 }}>
                {status && <Alert severity="success" sx={{ mb: 2 }}>{status}</Alert>}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {tab === 0 && !initialData && (
                    <Box textAlign="center" py={4}>
                        <Typography gutterBottom>
                            {t('addModal.scanInstruction')}
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleStartCapture}
                            disabled={scanning}
                            startIcon={scanning ? <CircularProgress size={20} /> : null}
                        >
                            {scanning ? t('addModal.scanning') : t('addModal.captureScreen')}
                        </Button>
                    </Box>
                )}

                {tab === 1 && (
                    <Box component="form" noValidate autoComplete="off">
                        <TextField
                            margin="normal"
                            fullWidth
                            label={t('addModal.issuerLabel')}
                            value={form.issuer}
                            onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            label={t('addModal.accountNameLabel')}
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            label={t('addModal.secretKeyLabel')}
                            value={form.secret}
                            onChange={(e) => setForm({ ...form, secret: e.target.value })}
                            helperText={t('addModal.secretHelper')}
                        />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{t('addModal.cancel')}</Button>
                <Button onClick={handleSubmit} variant="contained">{t('addModal.save')}</Button>
            </DialogActions>
        </Dialog>
    );
}
