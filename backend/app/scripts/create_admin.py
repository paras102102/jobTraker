import sys
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.services import user_service


def seed_admin() -> None:
    """Seed initial administrator account idempotently from configuration settings."""
    db = SessionLocal()
    try:
        admin_email = settings.ADMIN_EMAIL.strip().lower()
        existing = user_service.get_by_email(db, admin_email)
        if existing:
            print(f"[create_admin] Admin account already exists: {existing.email}")
            return

        admin_user = User(
            email=admin_email,
            password_hash=hash_password(settings.ADMIN_PASSWORD),
            full_name="System Administrator",
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"[create_admin] Successfully created administrator: {admin_user.email}")
    except Exception as exc:
        db.rollback()
        print(f"[create_admin] Error creating admin user: {str(exc)}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
