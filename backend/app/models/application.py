import datetime
import enum
import uuid
from typing import TYPE_CHECKING, List, Optional
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.reminder import Reminder
    from app.models.resume_analysis import ResumeAnalysis
    from app.models.user import User


class ApplicationStatus(str, enum.Enum):
    wishlist = "wishlist"
    applied = "applied"
    interview = "interview"
    offer = "offer"
    rejected = "rejected"


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    company: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    role_title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    job_url: Mapped[Optional[str]] = mapped_column(
        String(1024),
        nullable=True,
    )
    location: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    salary: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=12, scale=2),
        nullable=True,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        default="INR",
        nullable=False,
    )
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, name="application_status", native_enum=True),
        default=ApplicationStatus.wishlist,
        nullable=False,
    )
    position: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    job_description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    deadline: Mapped[Optional[datetime.date]] = mapped_column(
        Date,
        nullable=True,
    )
    applied_at: Mapped[Optional[datetime.date]] = mapped_column(
        Date,
        nullable=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Composite indexes
    __table_args__ = (
        Index("ix_applications_user_id_status", "user_id", "status"),
        Index("ix_applications_user_id_deadline", "user_id", "deadline"),
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="applications",
    )
    resume_analyses: Mapped[List["ResumeAnalysis"]] = relationship(
        "ResumeAnalysis",
        back_populates="application",
    )
    reminders: Mapped[List["Reminder"]] = relationship(
        "Reminder",
        back_populates="application",
        cascade="all, delete-orphan",
    )
