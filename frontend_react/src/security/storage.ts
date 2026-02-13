import {
    AesGcmEncryptionProvider,
    cryptoCodec,
    EncryptionProvider,
    KeyDeriver,
    Pbkdf2KeyDeriver,
} from './crypto';

export interface SecretRecord {
    name: string;
    issuer: string;
    secret: string;
}

export interface EncryptedEnvelope {
    version: number;
    cipher: string;
    salt: string;
    iterations: number;
}

export interface SecretStorage {
    save(records: SecretRecord[], passphrase: string): Promise<void>;
    load(passphrase: string): Promise<SecretRecord[] | null>;
    clear(): Promise<void>;
}

const DB_NAME = 'simple-2fa';
const STORE_NAME = 'secure-secrets';
const RECORD_ID = 'totp-secrets';

class IndexedDbSecretStorage implements SecretStorage {
    constructor(
        private readonly keyDeriver: KeyDeriver,
        private readonly encryptionProvider: EncryptionProvider,
    ) {}

    async save(records: SecretRecord[], passphrase: string): Promise<void> {
        const { key, salt, iterations } = await this.keyDeriver.deriveKey(passphrase);
        const cipher = await this.encryptionProvider.encrypt(JSON.stringify(records), key);

        const envelope: EncryptedEnvelope = {
            version: 1,
            cipher,
            salt: cryptoCodec.toBase64(salt),
            iterations,
        };

        const db = await this.openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(envelope, RECORD_ID);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async load(passphrase: string): Promise<SecretRecord[] | null> {
        const db = await this.openDb();
        const envelope = await new Promise<EncryptedEnvelope | undefined>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(RECORD_ID);
            req.onsuccess = () => resolve(req.result as EncryptedEnvelope | undefined);
            req.onerror = () => reject(req.error);
        });

        if (!envelope) {
            return null;
        }

        const { key } = await this.keyDeriver.deriveKey(passphrase, cryptoCodec.fromBase64(envelope.salt));
        const plaintext = await this.encryptionProvider.decrypt(envelope.cipher, key);
        return JSON.parse(plaintext) as SecretRecord[];
    }

    async clear(): Promise<void> {
        const db = await this.openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(RECORD_ID);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    private openDb(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

export const createSecretStorage = (
    keyDeriver: KeyDeriver = new Pbkdf2KeyDeriver(),
    encryptionProvider: EncryptionProvider = new AesGcmEncryptionProvider(),
): SecretStorage => {
    // TODO: Hook this storage into account create/update/delete sync lifecycle.
    // TODO: Add passphrase prompt and in-memory key cache for active session.
    // TODO: Support key rotation / migration from plaintext localStorage if introduced.
    return new IndexedDbSecretStorage(keyDeriver, encryptionProvider);
};
