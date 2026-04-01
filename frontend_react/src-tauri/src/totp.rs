use thiserror::Error;
use totp_rs::{Algorithm, TOTP};

#[derive(Error, Debug)]
pub enum TotpError {
    #[error("Invalid secret: {0}")]
    InvalidSecret(String),
    #[error("TOTP generation failed: {0}")]
    GenerationFailed(String),
}

/// Normalize a Base32 secret by:
/// 1. Stripping all non-Base32 characters (whitespace, dashes, etc.)
/// 2. Converting to uppercase
/// This mirrors pyotp's lenient behavior — no strict padding required.
fn normalize_secret(secret: &str) -> String {
    let mut normalized: String = secret
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '=')
        .collect::<String>()
        .to_uppercase();
        
    // Trim trailing '=' padding completely
    while normalized.ends_with('=') {
        normalized.pop();
    }
    
    normalized
}

/// Create a TOTP instance from a raw secret string.
/// Uses base32 crate directly for decoding (more lenient than totp-rs Secret::Encoded).
/// Uses new_unchecked to support short secrets (e.g. 80-bit/16-char).
fn create_totp(secret: &str) -> Result<TOTP, TotpError> {
    let normalized = normalize_secret(secret);

    // 直接使用 base32 crate 解码，比 totp-rs 的 Secret::Encoded 更宽容
    // 不要求严格的 RFC 4648 padding 规则
    let secret_bytes = base32::decode(base32::Alphabet::Rfc4648 { padding: false }, &normalized)
        .ok_or_else(|| TotpError::InvalidSecret("Could not decode base32 secret".to_string()))?;

    if secret_bytes.is_empty() {
        return Err(TotpError::InvalidSecret("Secret is empty".to_string()));
    }

    Ok(TOTP::new_unchecked(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret_bytes,
        None,          // issuer
        String::new(), // account_name
    ))
}

/// Generate a 6-digit TOTP code for the given secret.
pub fn generate_totp(secret: &str) -> Result<String, TotpError> {
    let totp = create_totp(secret)?;
    let time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| TotpError::GenerationFailed(e.to_string()))?
        .as_secs();
    Ok(totp.generate(time))
}

/// Get the remaining seconds until the current TOTP code expires.
pub fn get_ttl(secret: &str) -> Result<u64, TotpError> {
    let totp = create_totp(secret)?;
    let time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| TotpError::GenerationFailed(e.to_string()))?
        .as_secs();
    // TTL = period - (current_time % period)
    Ok(totp.step - (time % totp.step))
}

/// Validate that a secret can successfully generate TOTP codes.
/// Returns Ok(true) if valid, Err with message if invalid.
pub fn validate_secret(secret: &str) -> Result<bool, TotpError> {
    let _ = create_totp(secret)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    // 80-bit secret (16 Base32 chars = 10 bytes), common in Google Authenticator etc.
    const VALID_SECRET: &str = "JBSWY3DPEHPK3PXP";

    #[test]
    fn test_normalize_secret_uppercase() {
        let result = normalize_secret("jbswy3dpehpk3pxp");
        // 16 chars is already a multiple of 8, no padding needed
        assert_eq!(result, "JBSWY3DPEHPK3PXP");
    }

    #[test]
    fn test_normalize_secret_strips_whitespace() {
        let result = normalize_secret("JBSW Y3DP EHPK 3PXP");
        // After removing spaces: 16 chars, no padding needed
        assert_eq!(result, "JBSWY3DPEHPK3PXP");
    }

    #[test]
    fn test_normalize_secret_strips_dashes() {
        // Some services format secrets with dashes
        let result = normalize_secret("JBSW-Y3DP-EHPK-3PXP");
        assert_eq!(result, "JBSWY3DPEHPK3PXP");
    }

    #[test]
    fn test_normalize_secret_preserves_equals() {
        // Padding chars should be kept if they are somehow inner (though invalid Base32)
        // or stripped if trailing. Based on the fix, trailing '=' is fully removed.
        let result = normalize_secret("ABCDEFGH========");
        assert_eq!(result, "ABCDEFGH");
    }

    #[test]
    fn test_normalize_secret_strips_padding() {
        // Trailing padding must be stripped for Alphabet::Rfc4648 { padding: false }
        let result = normalize_secret("JBSWY3DPEHPK3PXP====");
        assert_eq!(result, "JBSWY3DPEHPK3PXP");
    }

    #[test]
    fn test_generate_totp_padded_secret() {
        // Real-world padded secret shouldn't fail on decoding.
        // It has padding, so it is larger than the 6-digit generation
        let code = generate_totp("JBSWY3DPEHPK3PXP====").unwrap();
        assert_eq!(code.len(), 6);
    }

    #[test]
    fn test_generate_totp_25char_secret() {
        // 25-char secret (produces invalid 7-char padding under strict Base32)
        // This is the real-world case that was failing
        let code = generate_totp("HNVNEEXPPAQWTYDFNPYRCFSWDQ").unwrap();
        assert_eq!(code.len(), 6);
    }

    #[test]
    fn test_generate_totp_returns_6_digits() {
        let code = generate_totp(VALID_SECRET).unwrap();
        assert_eq!(code.len(), 6);
        assert!(code.chars().all(|c| c.is_ascii_digit()));
    }

    #[test]
    fn test_generate_totp_consistent() {
        // Two calls within the same second should return the same code
        let code1 = generate_totp(VALID_SECRET).unwrap();
        let code2 = generate_totp(VALID_SECRET).unwrap();
        assert_eq!(code1, code2);
    }

    #[test]
    fn test_get_ttl_in_valid_range() {
        let ttl = get_ttl(VALID_SECRET).unwrap();
        // TTL should be 1..=30 for a 30-second period
        assert!(ttl >= 1 && ttl <= 30, "TTL was {}, expected 1-30", ttl);
    }

    #[test]
    fn test_validate_secret_valid() {
        assert!(validate_secret(VALID_SECRET).unwrap());
    }

    #[test]
    fn test_validate_secret_valid_lowercase() {
        // Should handle lowercase secrets
        assert!(validate_secret("jbswy3dpehpk3pxp").unwrap());
    }

    #[test]
    fn test_validate_secret_invalid() {
        // Empty / all-special-chars secret should fail
        let result = validate_secret("");
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("Invalid secret"), "Got: {}", err_msg);
    }

    #[test]
    fn test_validate_secret_with_spaces() {
        // Secrets with spaces should still work after normalization
        assert!(validate_secret("JBSW Y3DP EHPK 3PXP").unwrap());
    }

    #[test]
    fn test_generate_totp_short_secret() {
        // 80-bit (10 bytes) secrets should work — common in real services
        let code = generate_totp("JBSWY3DPEHPK3PXP").unwrap();
        assert_eq!(code.len(), 6);
    }

    #[test]
    fn test_generate_totp_invalid_secret() {
        let result = generate_totp("");
        assert!(result.is_err());
    }

    #[test]
    fn test_get_ttl_invalid_secret() {
        let result = get_ttl("");
        assert!(result.is_err());
    }
}
