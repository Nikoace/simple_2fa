use thiserror::Error;
use totp_rs::{Algorithm, Secret, TOTP};

#[derive(Error, Debug)]
pub enum TotpError {
    #[error("Invalid secret: {0}")]
    InvalidSecret(String),
    #[error("TOTP generation failed: {0}")]
    GenerationFailed(String),
}

/// Normalize a Base32 secret by:
/// 1. Stripping whitespace
/// 2. Converting to uppercase
/// 3. Adding correct padding (Base32 requires length as multiple of 8)
fn normalize_secret(secret: &str) -> String {
    let cleaned: String = secret
        .chars()
        .filter(|c| !c.is_whitespace())
        .collect::<String>()
        .to_uppercase();

    // Add padding if needed (Base32 requires length as multiple of 8)
    let padding_needed = (8 - cleaned.len() % 8) % 8;
    format!("{}{}", cleaned, "=".repeat(padding_needed))
}

/// Create a TOTP instance from a raw secret string.
/// Handles normalization and validation.
fn create_totp(secret: &str) -> Result<TOTP, TotpError> {
    let normalized = normalize_secret(secret);

    let secret_bytes = Secret::Encoded(normalized)
        .to_bytes()
        .map_err(|e| TotpError::InvalidSecret(e.to_string()))?;

    TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret_bytes,
        None,          // issuer
        String::new(), // account_name
    )
    .map_err(|e| TotpError::GenerationFailed(e.to_string()))
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

    // 128-bit minimum required by totp-rs (>= 16 bytes when decoded)
    // This 32-char Base32 secret decodes to 20 bytes = 160 bits
    const VALID_SECRET: &str = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

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
    fn test_normalize_secret_adds_padding() {
        // "ABC" has length 3, needs 5 padding chars to reach 8
        let result = normalize_secret("ABC");
        assert_eq!(result, "ABC=====");
    }

    #[test]
    fn test_normalize_secret_no_padding_needed() {
        // Length 8 - no padding needed
        let result = normalize_secret("ABCDEFGH");
        assert_eq!(result, "ABCDEFGH");
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
        // Should handle lowercase secrets (same long secret, lowercase)
        assert!(validate_secret("jbswy3dpehpk3pxpjbswy3dpehpk3pxp").unwrap());
    }

    #[test]
    fn test_validate_secret_invalid() {
        let result = validate_secret("!!!invalid!!!");
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("Invalid secret"), "Got: {}", err_msg);
    }

    #[test]
    fn test_validate_secret_with_spaces() {
        // Use a long-enough secret with spaces (>= 128 bits after decode)
        assert!(validate_secret("JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP").unwrap());
    }

    #[test]
    fn test_generate_totp_invalid_secret() {
        let result = generate_totp("!!!invalid!!!");
        assert!(result.is_err());
    }

    #[test]
    fn test_get_ttl_invalid_secret() {
        let result = get_ttl("!!!invalid!!!");
        assert!(result.is_err());
    }
}
