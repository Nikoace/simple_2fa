import pyotp
import time

def generate_secret() -> str:
    return pyotp.random_base32()

def _normalize_secret(secret: str) -> str:
    """
    Normalize a Base32 secret by:
    1. Stripping whitespace
    2. Converting to uppercase
    3. Adding correct padding (Base32 must have length as multiple of 8)
    """
    secret = secret.strip().upper().replace(" ", "")
    # Add padding if missing
    padding_needed = (8 - len(secret) % 8) % 8
    return secret + "=" * padding_needed

def get_totp_now(secret: str) -> str:
    totp = pyotp.TOTP(_normalize_secret(secret))
    return totp.now()

def verify_code(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(_normalize_secret(secret))
    return totp.verify(code)

def validate_secret(secret: str) -> bool:
    """
    Validate that a secret can successfully generate TOTP codes.
    Returns True if valid, raises ValueError with message if invalid.
    """
    try:
        normalized = _normalize_secret(secret)
        totp = pyotp.TOTP(normalized)
        totp.now()  # Attempt to generate a code to verify the secret is valid
        return True
    except Exception as e:
        raise ValueError(f"Invalid secret: {e}")


def get_ttl(secret: str) -> int:
    totp = pyotp.TOTP(_normalize_secret(secret))
    return totp.interval - (int(time.time()) % totp.interval)

