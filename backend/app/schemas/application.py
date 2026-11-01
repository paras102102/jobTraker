import datetime
import re
import uuid
from decimal import Decimal
from typing import List, Optional
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.application import ApplicationStatus


def validate_http_url(v: Optional[str]) -> Optional[str]:
    """Validate that the string is a valid HTTP or HTTPS URL under 2000 characters."""
    if v is None:
        return None
    cleaned = v.strip()
    if not cleaned:
        return None
    if len(cleaned) > 2000:
        raise ValueError("job_url must not exceed 2000 characters")
    parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("job_url must be a valid http or https URL")
    return cleaned


def validate_currency_code(v: Optional[str]) -> Optional[str]:
    """Validate that currency is a 3-letter uppercase ISO code."""
    if v is None:
        return "INR"
    cleaned = v.strip().upper()
    if not re.match(r"^[A-Z]{3}$", cleaned):
        raise ValueError("currency must be a 3-letter uppercase code (e.g. INR, USD, EUR)")
    return cleaned


class ApplicationBase(BaseModel):
    company: str
    role_title: str
    job_url: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[Decimal] = None
    currency: str = "INR"
    status: ApplicationStatus = ApplicationStatus.wishlist
    notes: Optional[str] = None
    job_description: Optional[str] = None
    deadline: Optional[datetime.date] = None
    applied_at: Optional[datetime.date] = None


class ApplicationCreate(ApplicationBase):
    company: str = Field(..., description="Company name")
    role_title: str = Field(..., description="Job role title")
    location: Optional[str] = Field(None, max_length=150)
    salary: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=5000)
    job_description: Optional[str] = Field(None, max_length=20000)

    @field_validator("company", "role_title")
    @classmethod
    def validate_non_empty_strings(cls, v: str) -> str:
        if v is None:
            raise ValueError("Field cannot be null")
        cleaned = v.strip()
        if len(cleaned) < 1 or len(cleaned) > 150:
            raise ValueError("Field must be between 1 and 150 characters")
        return cleaned

    @field_validator("job_url")
    @classmethod
    def validate_job_url(cls, v: Optional[str]) -> Optional[str]:
        return validate_http_url(v)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        return validate_currency_code(v)

    @model_validator(mode="after")
    def validate_dates(self) -> "ApplicationCreate":
        if self.applied_at is not None and self.applied_at > datetime.date.today():
            raise ValueError("applied_at cannot be in the future")
        return self


class ApplicationUpdate(BaseModel):
    company: Optional[str] = None
    role_title: Optional[str] = None
    job_url: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[Decimal] = None
    currency: Optional[str] = None
    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None
    job_description: Optional[str] = None
    deadline: Optional[datetime.date] = None
    applied_at: Optional[datetime.date] = None

    @field_validator("company", "role_title")
    @classmethod
    def validate_update_non_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            raise ValueError("Field cannot be null")
        cleaned = v.strip()
        if len(cleaned) < 1 or len(cleaned) > 150:
            raise ValueError("Field must be between 1 and 150 characters")
        return cleaned

    @field_validator("job_url")
    @classmethod
    def validate_update_job_url(cls, v: Optional[str]) -> Optional[str]:
        return validate_http_url(v)

    @field_validator("salary")
    @classmethod
    def validate_salary_positive(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("salary must be greater than or equal to 0")
        return v

    @field_validator("currency")
    @classmethod
    def validate_update_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_currency_code(v)
        return v

    @field_validator("location")
    @classmethod
    def validate_location(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if len(cleaned) > 150:
                raise ValueError("location must not exceed 150 characters")
            return cleaned
        return v

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 5000:
            raise ValueError("notes must not exceed 5000 characters")
        return v

    @field_validator("job_description")
    @classmethod
    def validate_job_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 20000:
            raise ValueError("job_description must not exceed 20000 characters")
        return v

    @model_validator(mode="after")
    def validate_dates(self) -> "ApplicationUpdate":
        if self.applied_at is not None and self.applied_at > datetime.date.today():
            raise ValueError("applied_at cannot be in the future")
        return self


class ApplicationMove(BaseModel):
    status: ApplicationStatus = Field(..., description="Target column status")
    position: int = Field(..., ge=0, description="Target zero-based position in column")


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    company: str
    role_title: str
    job_url: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[Decimal] = None
    currency: str = "INR"
    status: ApplicationStatus
    position: int
    notes: Optional[str] = None
    job_description: Optional[str] = None
    deadline: Optional[datetime.date] = None
    applied_at: Optional[datetime.date] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class ApplicationListResponse(BaseModel):
    items: List[ApplicationOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class BoardResponse(BaseModel):
    wishlist: List[ApplicationOut] = []
    applied: List[ApplicationOut] = []
    interview: List[ApplicationOut] = []
    offer: List[ApplicationOut] = []
    rejected: List[ApplicationOut] = []
