import uuid
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.auth import SignupRequest


def get_by_email(db: Session, email: str) -> Optional[User]:
    """Retrieve a user by their lowercase email address."""
    clean_email = email.strip().lower()
    stmt = select(User).where(User.email == clean_email)
    return db.scalars(stmt).first()


def get_by_id(db: Session, user_id: uuid.UUID) -> Optional[User]:
    """Retrieve a user by their unique UUID primary key."""
    stmt = select(User).where(User.id == user_id)
    return db.scalars(stmt).first()


def create_user(db: Session, signup_data: SignupRequest) -> User:
    """Create a new standard user with hashed password and forced 'user' role."""
    new_user = User(
        email=signup_data.email.strip().lower(),
        password_hash=hash_password(signup_data.password),
        full_name=signup_data.full_name.strip(),
        role=UserRole.user,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Verify credentials and return the user if valid, or None if invalid."""
    user = get_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def list_users(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
) -> Tuple[List[User], int]:
    """Paginated user listing with optional case-insensitive search by email or full name."""
    query = select(User)
    count_query = select(func.count(User.id))

    if search and search.strip():
        term = f"%{search.strip()}%"
        filter_clause = or_(User.email.ilike(term), User.full_name.ilike(term))
        query = query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    total = db.scalar(count_query) or 0
    offset = max(0, (page - 1) * page_size)
    items = list(
        db.scalars(
            query.order_by(User.created_at.desc()).offset(offset).limit(page_size)
        ).all()
    )
    return items, total


def update_user(db: Session, user: User, update_data: Dict[str, Any]) -> User:
    """Apply field updates to an existing user."""
    for field, val in update_data.items():
        if hasattr(user, field) and val is not None:
            setattr(user, field, val)
    db.commit()
    db.refresh(user)
    return user


def change_user_password(
    db: Session, user: User, current_password: str, new_password: str
) -> bool:
    """Verify existing password and apply a new bcrypt hash. Returns False on mismatch."""
    if not verify_password(current_password, user.password_hash):
        return False
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return True
