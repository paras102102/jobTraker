import datetime
from typing import Any, Dict

import bcrypt
import jwt

from app.core.config import settings


class SecurityTokenError(Exception):
    """Exception raised when JWT token decoding, expiration, or type verification fails."""

    pass


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using bcrypt directly."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str, role: str) -> str:
    """Generate a signed JWT access token containing subject, role, and expiry."""
    now = datetime.datetime.now(datetime.timezone.utc)
    expire = now + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "role": str(role),
        "type": "access",
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str) -> str:
    """Generate a signed JWT refresh token with long-lived expiry."""
    now = datetime.datetime.now(datetime.timezone.utc)
    expire = now + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "type": "refresh",
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str, expected_type: str) -> Dict[str, Any]:
    """Decode and validate a JWT token, verifying signature, expiry, and token type.

    Raises:
        SecurityTokenError: If token is expired, corrupted, or has an invalid type claim.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        raise SecurityTokenError("Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise SecurityTokenError("Invalid token signature or structure") from exc

    token_type = payload.get("type")
    if token_type != expected_type:
        raise SecurityTokenError(
            f"Invalid token type: expected '{expected_type}', got '{token_type}'"
        )

    if not payload.get("sub"):
        raise SecurityTokenError("Token missing required subject claim ('sub')")

    return payload
