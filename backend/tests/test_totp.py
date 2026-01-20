import pyotp
from app.core.totp import generate_secret, get_totp_now, verify_code

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
