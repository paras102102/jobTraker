import datetime
import uuid
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.models.application import Application, ApplicationStatus
from app.schemas.application import ApplicationCreate, ApplicationUpdate


def get_application(
    db: Session, user_id: uuid.UUID, app_id: uuid.UUID
) -> Optional[Application]:
    """Retrieve an application by id strictly scoped to the given user."""
    stmt = select(Application).where(
        Application.id == app_id,
        Application.user_id == user_id,
    )
    return db.scalars(stmt).first()


def create_application(
    db: Session, user_id: uuid.UUID, data: ApplicationCreate
) -> Application:
    """Create a new application at the end of its status column."""
    max_pos = db.scalar(
        select(func.max(Application.position)).where(
            Application.user_id == user_id,
            Application.status == data.status,
        )
    )
    new_position = (max_pos + 1) if max_pos is not None else 0

    applied_at = data.applied_at
    if data.status == ApplicationStatus.applied and applied_at is None:
        applied_at = datetime.date.today()

    new_app = Application(
        user_id=user_id,
        company=data.company,
        role_title=data.role_title,
        job_url=data.job_url,
        location=data.location,
        salary=data.salary,
        currency=data.currency,
        status=data.status,
        position=new_position,
        notes=data.notes,
        job_description=data.job_description,
        deadline=data.deadline,
        applied_at=applied_at,
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    return new_app


def list_applications(
    db: Session,
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    statuses: Optional[List[ApplicationStatus]] = None,
    deadline_before: Optional[datetime.date] = None,
    deadline_after: Optional[datetime.date] = None,
    has_deadline: Optional[bool] = None,
    sort_by: str = "created_at",
    order: str = "desc",
) -> Tuple[List[Application], int]:
    """List applications with filtering, search escaping, nulls-last sorting, and pagination."""
    query = select(Application).where(Application.user_id == user_id)
    count_query = select(func.count(Application.id)).where(Application.user_id == user_id)

    # 1. Search filter with escaped wildcards
    if search and search.strip():
        escaped = (
            search.strip()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        term = f"%{escaped}%"
        filter_clause = or_(
            Application.company.ilike(term, escape="\\"),
            Application.role_title.ilike(term, escape="\\"),
            Application.notes.ilike(term, escape="\\"),
            Application.location.ilike(term, escape="\\"),
        )
        query = query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    # 2. Multi-status filter
    if statuses:
        query = query.where(Application.status.in_(statuses))
        count_query = count_query.where(Application.status.in_(statuses))

    # 3. Deadline filters
    if deadline_before is not None:
        query = query.where(Application.deadline <= deadline_before)
        count_query = count_query.where(Application.deadline <= deadline_before)

    if deadline_after is not None:
        query = query.where(Application.deadline >= deadline_after)
        count_query = count_query.where(Application.deadline >= deadline_after)

    if has_deadline is True:
        query = query.where(Application.deadline.isnot(None))
        count_query = count_query.where(Application.deadline.isnot(None))
    elif has_deadline is False:
        query = query.where(Application.deadline.is_(None))
        count_query = count_query.where(Application.deadline.is_(None))

    total = db.scalar(count_query) or 0

    # 4. Sorting with NULLS LAST for deadline and salary
    sort_col = getattr(Application, sort_by, Application.created_at)
    is_asc = order.lower() == "asc"

    if sort_by in ("deadline", "salary"):
        sort_expr = sort_col.asc().nullslast() if is_asc else sort_col.desc().nullslast()
    else:
        sort_expr = sort_col.asc() if is_asc else sort_col.desc()

    # Stable pagination: primary sort + secondary sort by id
    query = query.order_by(sort_expr, Application.id.desc())

    offset = max(0, (page - 1) * page_size)
    items = list(db.scalars(query.offset(offset).limit(page_size)).all())

    return items, total


def update_application(
    db: Session,
    user_id: uuid.UUID,
    app_id: uuid.UUID,
    data: ApplicationUpdate,
) -> Optional[Application]:
    """Partially update an application. Moving status moves it to the end of the new column."""
    app = get_application(db, user_id=user_id, app_id=app_id)
    if app is None:
        return None

    update_dict = data.model_dump(exclude_unset=True)
    if not update_dict:
        return app

    # Check if status has changed
    if "status" in update_dict and update_dict["status"] != app.status:
        old_status = app.status
        old_pos = app.position
        new_status = update_dict["status"]

        # Close the gap in the old column
        db.execute(
            update(Application)
            .where(
                Application.user_id == user_id,
                Application.status == old_status,
                Application.position > old_pos,
            )
            .values(position=Application.position - 1)
        )

        # Place at the end of the new column
        max_pos = db.scalar(
            select(func.max(Application.position)).where(
                Application.user_id == user_id,
                Application.status == new_status,
            )
        )
        app.position = (max_pos + 1) if max_pos is not None else 0

        # Auto-set applied_at to today if moving to "applied" without a date
        if new_status == ApplicationStatus.applied:
            if not update_dict.get("applied_at") and app.applied_at is None:
                update_dict["applied_at"] = datetime.date.today()

    for field, val in update_dict.items():
        setattr(app, field, val)

    db.commit()
    db.refresh(app)
    return app


def delete_application(
    db: Session, user_id: uuid.UUID, app_id: uuid.UUID
) -> bool:
    """Delete an application and renumber positions in that column to remain contiguous."""
    app = get_application(db, user_id=user_id, app_id=app_id)
    if app is None:
        return False

    old_status = app.status
    old_pos = app.position

    db.delete(app)

    # Shift subsequent cards down by 1 to close the gap
    db.execute(
        update(Application)
        .where(
            Application.user_id == user_id,
            Application.status == old_status,
            Application.position > old_pos,
        )
        .values(position=Application.position - 1)
    )

    db.commit()
    return True


def move_application(
    db: Session,
    user_id: uuid.UUID,
    app_id: uuid.UUID,
    new_status: ApplicationStatus,
    new_position: int,
) -> Optional[Application]:
    """Move an application across or within columns, keeping positions contiguous in one transaction."""
    app = get_application(db, user_id=user_id, app_id=app_id)
    if app is None:
        return None

    old_status = app.status
    old_pos = app.position

    # Case A: Reordering within the SAME column
    if old_status == new_status:
        col_count = db.scalar(
            select(func.count(Application.id)).where(
                Application.user_id == user_id,
                Application.status == old_status,
            )
        ) or 0
        target_pos = max(0, min(new_position, col_count - 1))

        if target_pos == old_pos:
            return app

        if target_pos < old_pos:
            # Moving up: shift items in [target_pos, old_pos - 1] down (+1)
            db.execute(
                update(Application)
                .where(
                    Application.user_id == user_id,
                    Application.status == old_status,
                    Application.position >= target_pos,
                    Application.position < old_pos,
                )
                .values(position=Application.position + 1)
            )
        else:
            # Moving down: shift items in [old_pos + 1, target_pos] up (-1)
            db.execute(
                update(Application)
                .where(
                    Application.user_id == user_id,
                    Application.status == old_status,
                    Application.position > old_pos,
                    Application.position <= target_pos,
                )
                .values(position=Application.position - 1)
            )

        app.position = target_pos

    # Case B: Moving ACROSS different columns
    else:
        # 1. Close gap in old column
        db.execute(
            update(Application)
            .where(
                Application.user_id == user_id,
                Application.status == old_status,
                Application.position > old_pos,
            )
            .values(position=Application.position - 1)
        )

        # 2. Clamp target position in new column
        dest_count = db.scalar(
            select(func.count(Application.id)).where(
                Application.user_id == user_id,
                Application.status == new_status,
            )
        ) or 0
        target_pos = max(0, min(new_position, dest_count))

        # 3. Open gap at target_pos in new column
        db.execute(
            update(Application)
            .where(
                Application.user_id == user_id,
                Application.status == new_status,
                Application.position >= target_pos,
            )
            .values(position=Application.position + 1)
        )

        # 4. Place card
        app.status = new_status
        app.position = target_pos

        if new_status == ApplicationStatus.applied and app.applied_at is None:
            app.applied_at = datetime.date.today()

    db.commit()
    db.refresh(app)
    return app


def get_board(
    db: Session, user_id: uuid.UUID
) -> Dict[str, List[Application]]:
    """Retrieve all user applications grouped by status in a single query sorted by position."""
    stmt = (
        select(Application)
        .where(Application.user_id == user_id)
        .order_by(Application.status, Application.position.asc(), Application.created_at.asc())
    )
    items = list(db.scalars(stmt).all())

    board: Dict[str, List[Application]] = {
        "wishlist": [],
        "applied": [],
        "interview": [],
        "offer": [],
        "rejected": [],
    }

    for item in items:
        status_key = item.status.value if hasattr(item.status, "value") else str(item.status)
        if status_key in board:
            board[status_key].append(item)

    return board
