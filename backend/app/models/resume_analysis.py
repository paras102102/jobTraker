import datetime
import uuid
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.resume import Resume


class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    application_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    job_description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    match_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    missing_keywords: Mapped[List[str] | Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )
    suggestions: Mapped[List[str] | Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )
    model_used: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    resume: Mapped["Resume"] = relationship(
        "Resume",
        back_populates="analyses",
    )
    application: Mapped[Optional["Application"]] = relationship(
        "Application",
        back_populates="resume_analyses",
    )
