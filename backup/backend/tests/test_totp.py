import pytest
import pyotp
from app.core.totp import generate_secret, get_totp_now, verify_code, validate_secret

def test_generate_secret():
    secret = generate_secret()
    assert len(secret) == 32
    assert isinstance(secret, str)

def test_get_totp_now():
    secret = pyotp.random_base32()
    code = get_totp_now(secret)
    assert len(code) == 6
    assert code.isdigit()
    
    # Verify with direct pyotp call
    totp = pyotp.TOTP(secret)
    assert totp.verify(code)

def test_verify_code():
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    code = totp.now()
    
    assert verify_code(secret, code) is True
    assert verify_code(secret, "000000") is False


def test_validate_secret_valid():
    """Test that valid Base32 secrets pass validation."""
    secret = pyotp.random_base32()
    assert validate_secret(secret) is True


def test_validate_secret_invalid():
    """Test that invalid secrets raise ValueError."""
    with pytest.raises(ValueError) as exc:
        validate_secret("invalid-secret!")
    assert "Invalid secret" in str(exc.value)


def test_validate_secret_invalid_base32_chars():
    """Test that secrets with invalid Base32 characters raise ValueError."""
    with pytest.raises(ValueError) as exc:
        validate_secret("hellotest")
    assert "Invalid secret" in str(exc.value)

