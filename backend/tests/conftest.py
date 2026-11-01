from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Compile PostgreSQL JSONB to SQLite JSON during local tests
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

from app.core.config import settings  # noqa: E402
from app.core.database import get_db  # noqa: E402
from app.core.limiter import limiter  # noqa: E402
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402

# Use separate test database URL if configured, otherwise an in-memory SQLite with StaticPool
TEST_DB_URL = settings.TEST_DATABASE_URL or "sqlite:///:memory:"

connect_args = {}
poolclass = None
if TEST_DB_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    poolclass = StaticPool

test_engine = create_engine(
    TEST_DB_URL,
    connect_args=connect_args,
    poolclass=poolclass if poolclass else None,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create all tables once per test session and tear down at the end."""
    # Ensure rate limiting is disabled by default across all test runs
    limiter.enabled = False

    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide an isolated database session per test with clean tables."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        # Clean up tables between tests to guarantee isolation
        for table in reversed(Base.metadata.sorted_tables):
            session.execute(table.delete())
        session.commit()
        session.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """TestClient configured with test database session override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def normal_user(db_session: Session) -> User:
    """Create a persistent normal test user."""
    user = User(
        email="testuser@example.com",
        password_hash=hash_password("ValidPassword123"),
        full_name="Test Normal User",
        role=UserRole.user,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def normal_auth_headers(normal_user: User) -> dict[str, str]:
    """Return Authorization Bearer header for a normal user."""
    token = create_access_token(subject=str(normal_user.id), role=normal_user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Create a persistent admin test user."""
    admin = User(
        email="admin@example.com",
        password_hash=hash_password("AdminPassword123"),
        full_name="Test Administrator",
        role=UserRole.admin,
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture
def admin_auth_headers(admin_user: User) -> dict[str, str]:
    """Return Authorization Bearer header for an admin user."""
    token = create_access_token(subject=str(admin_user.id), role=admin_user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_user(db_session: Session) -> User:
    """Create a second distinct test user for cross-user isolation tests."""
    user = User(
        email="otheruser@example.com",
        password_hash=hash_password("OtherPassword123"),
        full_name="Other Test User",
        role=UserRole.user,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def other_auth_headers(other_user: User) -> dict[str, str]:
    """Return Authorization Bearer header for the second test user."""
    token = create_access_token(subject=str(other_user.id), role=other_user.role.value)
    return {"Authorization": f"Bearer {token}"}

