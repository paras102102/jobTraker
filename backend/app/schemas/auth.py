from pydantic import BaseModel, EmailStr, field_validator


def validate_password_complexity(v: str) -> str:
    """Validate password rules: min 8 chars, max 72 bytes, at least 1 letter and 1 digit."""
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if len(v.encode("utf-8")) > 72:
        raise ValueError("Password must not exceed 72 bytes in length")
    if not any(c.isalpha() for c in v):
        raise ValueError("Password must contain at least one letter")
    if not any(c.isdigit() for c in v):
        raise ValueError("Password must contain at least one digit")
    return v


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        trimmed = v.strip()
        if len(trimmed) < 2 or len(trimmed) > 100:
            raise ValueError("Full name must be between 2 and 100 characters")
        return trimmed

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_complexity(v)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str
