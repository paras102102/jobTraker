"""SQLAlchemy models package for JobTrackr."""

from app.core.database import Base
from app.models.application import Application, ApplicationStatus
from app.models.reminder import Reminder, ReminderStatus, ReminderType
from app.models.resume import Resume
from app.models.resume_analysis import ResumeAnalysis
from app.models.user import User, UserRole

__all__ = [
    "Base",
    "User",
    "UserRole",
    "Application",
    "ApplicationStatus",
    "Resume",
    "ResumeAnalysis",
    "Reminder",
    "ReminderType",
    "ReminderStatus",
]
