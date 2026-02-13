const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface DerivedKeyMaterial {
    key: CryptoKey;
    salt: Uint8Array;
    iterations: number;
}

export interface KeyDeriver {
    deriveKey(passphrase: string, existingSalt?: Uint8Array): Promise<DerivedKeyMaterial>;
}

export interface EncryptionProvider {
    encrypt(plaintext: string, key: CryptoKey): Promise<string>;
    decrypt(ciphertext: string, key: CryptoKey): Promise<string>;
}

const DEFAULT_PBKDF2_ITERATIONS = 310_000;
const PBKDF2_HASH = 'SHA-256';
const AES_ALGO = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const GCM_IV_BYTES = 12;
const SALT_BYTES = 16;

const randomBytes = (size: number): Uint8Array => {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return bytes;
};

const toBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
};

const fromBase64 = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

export class Pbkdf2KeyDeriver implements KeyDeriver {
    private readonly iterations: number;

    constructor(iterations = DEFAULT_PBKDF2_ITERATIONS) {
        this.iterations = iterations;
    }

    async deriveKey(passphrase: string, existingSalt?: Uint8Array): Promise<DerivedKeyMaterial> {
        const salt = existingSalt ?? randomBytes(SALT_BYTES);
        const importedKey = await crypto.subtle.importKey(
            'raw',
            textEncoder.encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey'],
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                hash: PBKDF2_HASH,
                salt,
                iterations: this.iterations,
            },
            importedKey,
            {
                name: AES_ALGO,
                length: AES_KEY_LENGTH,
            },
            false,
            ['encrypt', 'decrypt'],
        );

        return { key, salt, iterations: this.iterations };
    }
}

export class AesGcmEncryptionProvider implements EncryptionProvider {
    async encrypt(plaintext: string, key: CryptoKey): Promise<string> {
        const iv = randomBytes(GCM_IV_BYTES);
        const encoded = textEncoder.encode(plaintext);
        const encrypted = await crypto.subtle.encrypt({ name: AES_ALGO, iv }, key, encoded);
        const payload = {
            alg: AES_ALGO,
            iv: toBase64(iv),
            data: toBase64(new Uint8Array(encrypted)),
        };

        return JSON.stringify(payload);
    }

    async decrypt(ciphertext: string, key: CryptoKey): Promise<string> {
        const payload = JSON.parse(ciphertext) as { iv: string; data: string };
        const iv = fromBase64(payload.iv);
        const data = fromBase64(payload.data);
        const decrypted = await crypto.subtle.decrypt({ name: AES_ALGO, iv }, key, data);
        return textDecoder.decode(decrypted);
    }
}

export const cryptoCodec = {
    toBase64,
    fromBase64,
};

