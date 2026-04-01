use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{Argon2, Params, Version};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};

/// 导出用的账户结构（含密钥，绝不发送到前端）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ExportAccount {
    pub name: String,
    pub issuer: Option<String>,
    pub secret: String,
}

/// 加密文件二进制格式:
/// [8B magic "S2FA_ENC"][16B salt][12B nonce][可变长度密文]
const MAGIC: &[u8; 8] = b"S2FA_ENC";
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;
const HEADER_LEN: usize = 8 + SALT_LEN + NONCE_LEN; // 36 bytes

#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("加密失败: {0}")]
    EncryptionFailed(String),
    #[error("解密失败：密码错误或文件已损坏")]
    DecryptionFailed,
    #[error("无效的文件格式")]
    InvalidFormat,
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),
    #[error("序列化错误: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("密钥派生错误")]
    KeyDerivationFailed,
}

/// 使用 Argon2id 从密码和 salt 派生 256-bit 密钥
fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32], CryptoError> {
    let params = Params::new(
        65536, // m_cost: 64MB
        3,     // t_cost: 3 次迭代
        4,     // p_cost: 4 线程
        Some(32),
    )
    .map_err(|_| CryptoError::KeyDerivationFailed)?;

    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|_| CryptoError::KeyDerivationFailed)?;
    Ok(key)
}

/// 将账户列表加密，返回完整文件内容（magic + salt + nonce + 密文）
pub fn encrypt_accounts(
    accounts: &[ExportAccount],
    password: &str,
) -> Result<Vec<u8>, CryptoError> {
    // 随机生成 salt 和 nonce
    let mut salt = [0u8; SALT_LEN];
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce_bytes);

    // 派生密钥
    let key = derive_key(password, &salt)?;

    // JSON 序列化
    let plaintext = serde_json::to_vec(accounts)?;

    // AES-256-GCM 加密
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_ref())
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

    // 组装文件: magic + salt + nonce + ciphertext
    let mut output = Vec::with_capacity(HEADER_LEN + ciphertext.len());
    output.extend_from_slice(MAGIC);
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    Ok(output)
}

/// 解密文件内容，返回账户列表
pub fn decrypt_accounts(data: &[u8], password: &str) -> Result<Vec<ExportAccount>, CryptoError> {
    // 校验最小长度
    if data.len() < HEADER_LEN + 1 {
        return Err(CryptoError::InvalidFormat);
    }

    // 校验 magic bytes
    if &data[..8] != MAGIC {
        return Err(CryptoError::InvalidFormat);
    }

    let salt = &data[8..8 + SALT_LEN];
    let nonce_bytes = &data[8 + SALT_LEN..HEADER_LEN];
    let ciphertext = &data[HEADER_LEN..];

    // 派生密钥
    let key = derive_key(password, salt)?;

    // AES-256-GCM 解密
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|_| CryptoError::DecryptionFailed)?;
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| CryptoError::DecryptionFailed)?;

    // JSON 反序列化
    let accounts: Vec<ExportAccount> = serde_json::from_slice(&plaintext)?;
    Ok(accounts)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_accounts() -> Vec<ExportAccount> {
        vec![
            ExportAccount {
                name: "alice@example.com".to_string(),
                issuer: Some("GitHub".to_string()),
                secret: "JBSWY3DPEHPK3PXP".to_string(),
            },
            ExportAccount {
                name: "bob@example.com".to_string(),
                issuer: None,
                secret: "JBSWY3DPEHPK3PXP".to_string(),
            },
        ]
    }

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let accounts = sample_accounts();
        let password = "test_password_123";

        let encrypted = encrypt_accounts(&accounts, password).expect("加密失败");
        let decrypted = decrypt_accounts(&encrypted, password).expect("解密失败");

        assert_eq!(accounts, decrypted);
    }

    #[test]
    fn test_decrypt_wrong_password() {
        let accounts = sample_accounts();
        let encrypted = encrypt_accounts(&accounts, "correct_password").expect("加密失败");
        let result = decrypt_accounts(&encrypted, "wrong_password");

        assert!(matches!(result, Err(CryptoError::DecryptionFailed)));
    }

    #[test]
    fn test_decrypt_corrupted_data() {
        let accounts = sample_accounts();
        let mut encrypted = encrypt_accounts(&accounts, "password").expect("加密失败");
        // 损坏密文部分
        let last = encrypted.len() - 1;
        encrypted[last] ^= 0xFF;

        let result = decrypt_accounts(&encrypted, "password");
        assert!(matches!(result, Err(CryptoError::DecryptionFailed)));
    }

    #[test]
    fn test_decrypt_invalid_magic() {
        let mut data = vec![0u8; HEADER_LEN + 10];
        // 错误的 magic bytes
        data[..8].copy_from_slice(b"INVALID!");

        let result = decrypt_accounts(&data, "password");
        assert!(matches!(result, Err(CryptoError::InvalidFormat)));
    }

    #[test]
    fn test_decrypt_too_short() {
        let data = vec![0u8; 10]; // 太短
        let result = decrypt_accounts(&data, "password");
        assert!(matches!(result, Err(CryptoError::InvalidFormat)));
    }

    #[test]
    fn test_encrypt_empty_accounts() {
        let accounts: Vec<ExportAccount> = vec![];
        let encrypted = encrypt_accounts(&accounts, "password").expect("加密空列表失败");
        let decrypted = decrypt_accounts(&encrypted, "password").expect("解密失败");
        assert!(decrypted.is_empty());
    }

    #[test]
    fn test_different_passwords_produce_different_output() {
        let accounts = sample_accounts();
        let enc1 = encrypt_accounts(&accounts, "password1").expect("加密失败");
        let enc2 = encrypt_accounts(&accounts, "password2").expect("加密失败");
        assert_ne!(enc1, enc2);
    }

    #[test]
    fn test_random_salt_produces_different_output() {
        let accounts = sample_accounts();
        let password = "same_password";
        let enc1 = encrypt_accounts(&accounts, password).expect("加密失败");
        let enc2 = encrypt_accounts(&accounts, password).expect("加密失败");
        // 因 salt/nonce 随机，两次加密结果应不同
        assert_ne!(enc1, enc2);
    }

    #[test]
    fn test_account_with_none_issuer_roundtrip() {
        let accounts = vec![ExportAccount {
            name: "test".to_string(),
            issuer: None,
            secret: "JBSWY3DPEHPK3PXP".to_string(),
        }];
        let encrypted = encrypt_accounts(&accounts, "pw").expect("加密失败");
        let decrypted = decrypt_accounts(&encrypted, "pw").expect("解密失败");
        assert_eq!(accounts, decrypted);
        assert!(decrypted[0].issuer.is_none());
    }
}
