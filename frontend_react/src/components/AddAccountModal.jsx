import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Tabs, Tab, Box, TextField, Button, DialogActions, Typography, Alert, CircularProgress } from '@mui/material';
import jsQR from 'jsqr';

export default function AddAccountModal({ open, onClose, onAccountAdded, initialData }) {
    const [tab, setTab] = useState(0); // 0 = Scan, 1 = Manual
    const [form, setForm] = useState({ name: '', issuer: '', secret: '' });
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name || '',
                issuer: initialData.issuer || '',
                secret: initialData.secret || ''
            });
            setTab(1); // Force Manual tab for editing
            setStatus('');
            setError('');
        } else {
            setForm({ name: '', issuer: '', secret: '' });
            setTab(0); // Default to scan
        }
    }, [initialData, open]);

    const handleTabChange = (event, newValue) => {
        setTab(newValue);
        setError('');
        setStatus('');
    };

    const handleStartCapture = async () => {
        setError('');
        setStatus('Select the window/screen with the QR code...');
        setScanning(true);

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "never" }
            });

            const track = stream.getVideoTracks()[0];

            // Wait for stream to be active
            await new Promise(r => setTimeout(r, 500));

            let foundCode = null;

            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            // Wait for video to have dimensions
            await new Promise(resolve => {
                video.onloadedmetadata = () => resolve();
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

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
                setError('No QR code found in the selection.');
            }

        } catch (err) {
            console.error(err);
            setError('Capture cancelled or failed: ' + err.message);
        } finally {
            setScanning(false);
            setStatus('');
        }
    };

    const handleQrFound = (data) => {
        try {
            if (!data.startsWith('otpauth://')) {
                throw new Error('Not a valid OTP URL');
            }
            const url = new URL(data);
            const params = new URLSearchParams(url.search);
            const secret = params.get('secret');
            const issuer = params.get('issuer') || 'Unknown';
            const pathname = decodeURIComponent(url.pathname);
            // Clean up name
            let name = pathname.split(':').pop() || pathname.replace('/', '');

            if (!secret) throw new Error('No secret found');

            setForm({ name, issuer, secret });
            setTab(1); // Switch to manual tab for editing
            setStatus('QR Code scanned! You can edit details below.');
        } catch (e) {
            setError(e.message);
        }
    };

    const handleSubmit = async () => {
        if (!form.secret || !form.name) {
            setError('Name and Secret are required.');
            return;
        }

        try {
            const url = initialData?.id
                ? `/api/accounts/${initialData.id}`
                : '/api/accounts';

            const method = initialData?.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                onAccountAdded();
                handleClose();
            } else {
                setError('Failed to save account.');
            }
        } catch (e) {
            setError('Network error.');
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
            <DialogTitle>{initialData ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
                <Tab label={initialData ? "Edit Details" : "Scan QR"} disabled={!!initialData && tab === 1} />
                <Tab label="Manual Input" />
            </Tabs>
            <DialogContent sx={{ mt: 2, minHeight: 200 }}>
                {status && <Alert severity="success" sx={{ mb: 2 }}>{status}</Alert>}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {tab === 0 && !initialData && (
                    <Box textAlign="center" py={4}>
                        <Typography gutterBottom>
                            Scan a QR code from your screen.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleStartCapture}
                            disabled={scanning}
                            startIcon={scanning ? <CircularProgress size={20} /> : null}
                        >
                            {scanning ? 'Scanning...' : 'Capture Screen'}
                        </Button>
                    </Box>
                )}

                {tab === 1 && (
                    <Box component="form" noValidate autoComplete="off">
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Issuer (Service Name)"
                            value={form.issuer}
                            onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Account Name (Email/User)"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Secret Key"
                            value={form.secret}
                            onChange={(e) => setForm({ ...form, secret: e.target.value })}
                            helperText="Base32 string"
                        />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained">Save</Button>
            </DialogActions>
        </Dialog>
    );
}
