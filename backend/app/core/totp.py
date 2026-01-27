import pyotp
import time

def generate_secret() -> str:
    return pyotp.random_base32()

def get_totp_now(secret: str) -> str:
    totp = pyotp.TOTP(secret)
    return totp.now()

def verify_code(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code)

def get_ttl(secret: str) -> int:
    totp = pyotp.TOTP(secret)
    return totp.interval - (int(time.time()) % totp.interval)
