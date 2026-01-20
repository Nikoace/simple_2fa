const app = {
    init() {
        this.cacheDom();
        this.bindEvents();
        this.fetchAccounts();
        setInterval(() => this.fetchAccounts(), 5000);
    },

    cacheDom() {
        this.accountList = document.getElementById('account-list');
        this.addBtn = document.getElementById('add-btn');
        this.modal = document.getElementById('scan-modal');
        this.scanBtn = document.getElementById('scan-screen-btn');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.scanStatus = document.getElementById('scan-status');
    },

    bindEvents() {
        this.addBtn.addEventListener('click', () => this.openModal());
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.scanBtn.addEventListener('click', () => this.startScreenCapture());
    },

    openModal() {
        this.modal.classList.remove('hidden');
        this.scanStatus.textContent = '';
        this.scanStatus.className = 'status-msg';
    },

    closeModal() {
        this.modal.classList.add('hidden');
    },

    async fetchAccounts() {
        try {
            const res = await fetch('/api/accounts');
            const data = await res.json();
            this.renderAccounts(data);
        } catch (e) {
            console.error(e);
        }
    },

    renderAccounts(accounts) {
        if (accounts.length === 0) {
            this.accountList.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding: 40px;">No accounts yet. Add one!</div>';
            return;
        }

        this.accountList.innerHTML = accounts.map(acc => {
            const width = (acc.ttl / 30) * 100;
            const isDanger = acc.ttl < 5;
            const codeFormatted = acc.code.match(/.{1,3}/g).join(' ');

            return `
                <div class="account-card">
                    <div class="account-info">
                        <h3>${acc.issuer || 'Unknown'}</h3>
                        <p>${acc.name}</p>
                    </div>
                    <div class="code-display">
                        <div class="totp-code" style="color: ${isDanger ? 'var(--danger)' : 'var(--accent)'}">${codeFormatted}</div>
                    </div>
                    <div class="progress-bar ${isDanger ? 'danger' : ''}" style="width: ${width}%"></div>
                </div>
            `;
        }).join('');
    },

    async startScreenCapture() {
        this.scanStatus.textContent = 'Select the window containing the QR code...';

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "never" }
            });

            const track = stream.getVideoTracks()[0];
            const imageCapture = new ImageCapture(track);

            // Wait a bit for the stream to stabilize
            await new Promise(r => setTimeout(r, 500));

            let found = false;
            // Try capturing a few frames
            for (let i = 0; i < 10; i++) {
                if (found) break;

                const bitmap = await imageCapture.grabFrame();
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    found = true;
                    this.handleQrFound(code.data);
                    track.stop(); // Stop sharing
                } else {
                    await new Promise(r => setTimeout(r, 200));
                }
            }

            if (!found) {
                this.scanStatus.textContent = 'No QR code found. Please ensure the QR code is visible.';
                this.scanStatus.className = 'status-msg error';
                track.stop();
            }

        } catch (err) {
            console.error("Error: " + err);
            this.scanStatus.textContent = 'Cancelled or Error: ' + err.message;
            this.scanStatus.className = 'status-msg error';
        }
    },

    handleQrFound(qrData) {
        if (!qrData.startsWith('otpauth://')) {
            this.scanStatus.textContent = 'Invalid QR Code (Not a TOTP URL)';
            this.scanStatus.className = 'status-msg error';
            return;
        }

        try {
            const url = new URL(qrData);
            const params = new URLSearchParams(url.search);
            const secret = params.get('secret');
            const issuer = params.get('issuer') || 'Unknown';
            const pathname = decodeURIComponent(url.pathname);
            // pathname usually /Issuer:Name or /Name
            let name = pathname.split(':').pop() || pathname.replace('/', '');

            if (!secret) throw new Error('No secret found');

            this.createAccount({ name, issuer, secret });

        } catch (e) {
            this.scanStatus.textContent = 'Error parsing QR: ' + e.message;
            this.scanStatus.className = 'status-msg error';
        }
    },

    async createAccount(data) {
        try {
            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                this.scanStatus.textContent = 'Account added successfully!';
                this.scanStatus.className = 'status-msg success';
                setTimeout(() => this.closeModal(), 1500);
                this.fetchAccounts();
            } else {
                throw new Error('Server error');
            }
        } catch (e) {
            this.scanStatus.textContent = 'Failed to save account.';
            this.scanStatus.className = 'status-msg error';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
