import datetime
import pytest
import jwt

from app.core.config import settings
from app.core.security import (
    SecurityTokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_and_verification() -> None:
    """Test bcrypt password hashing and constant-time verification."""
    password = "MySecurePassword123"
    hashed = hash_password(password)

    assert hashed != password
    assert hashed.startswith("$2")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123", hashed) is False
    assert verify_password(password, "invalid_hash_string") is False


def test_create_and_decode_access_token() -> None:
    """Test access token payload creation and successful decoding."""
    subject = "12345678-1234-5678-1234-567812345678"
    role = "user"
    token = create_access_token(subject=subject, role=role)

    payload = decode_token(token, expected_type="access")
    assert payload["sub"] == subject
    assert payload["role"] == role
    assert payload["type"] == "access"
    assert "exp" in payload
    assert "iat" in payload


def test_create_and_decode_refresh_token() -> None:
    """Test refresh token payload creation and decoding."""
    subject = "12345678-1234-5678-1234-567812345678"
    token = create_refresh_token(subject=subject)

    payload = decode_token(token, expected_type="refresh")
    assert payload["sub"] == subject
    assert payload["type"] == "refresh"
    assert "exp" in payload


def test_decode_token_wrong_type() -> None:
    """Test that decoding with mismatched expected_type raises SecurityTokenError."""
    subject = "user-123"
    access_token = create_access_token(subject=subject, role="user")

    # Access token must not be accepted as a refresh token
    with pytest.raises(SecurityTokenError) as exc_info:
        decode_token(access_token, expected_type="refresh")
    assert "expected 'refresh'" in str(exc_info.value)

    refresh_token = create_refresh_token(subject=subject)
    # Refresh token must not be accepted as an access token
    with pytest.raises(SecurityTokenError) as exc_info:
        decode_token(refresh_token, expected_type="access")
    assert "expected 'access'" in str(exc_info.value)


def test_decode_invalid_and_expired_token() -> None:
    """Test that malformed or expired tokens raise SecurityTokenError."""
    # Malformed token
    with pytest.raises(SecurityTokenError) as exc_info:
        decode_token("not.a.valid.jwt.token", expected_type="access")
    assert "Invalid token" in str(exc_info.value)

    # Expired token
    now = datetime.datetime.now(datetime.timezone.utc)
    expired_payload = {
        "sub": "user-expired",
        "type": "access",
        "exp": now - datetime.timedelta(minutes=10),
        "iat": now - datetime.timedelta(minutes=20),
    }
    expired_token = jwt.encode(
        expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )

    with pytest.raises(SecurityTokenError) as exc_info:
        decode_token(expired_token, expected_type="access")
    assert "expired" in str(exc_info.value).lower()
