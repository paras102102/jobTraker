import datetime
import math
import uuid
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.application import ApplicationStatus
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationMove,
    ApplicationOut,
    ApplicationUpdate,
    BoardResponse,
)
from app.services import application_service

router = APIRouter(prefix="/api/applications", tags=["Applications"])

VALID_SORT_FIELDS = {
    "created_at",
    "updated_at",
    "company",
    "role_title",
    "deadline",
    "salary",
}


@router.post(
    "",
    response_model=ApplicationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new job application",
)
def create_application(
    app_in: ApplicationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApplicationOut:
    """Create a new job application. Placed at the end of the specified status column."""
    app = application_service.create_application(db, user_id=current_user.id, data=app_in)
    return ApplicationOut.model_validate(app)


@router.get(
    "",
    response_model=ApplicationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List applications with search, multi-status filters, sorting, and pagination",
)
def list_applications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search across company, role, notes, and location"),
    status_filter: Optional[List[ApplicationStatus]] = Query(None, alias="status", description="Filter by status (can be repeated)"),
    deadline_before: Optional[datetime.date] = Query(None, description="Deadline on or before this date"),
    deadline_after: Optional[datetime.date] = Query(None, description="Deadline on or after this date"),
    has_deadline: Optional[bool] = Query(None, description="Filter applications with or without a deadline"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    order: str = Query("desc", description="Sort order: 'asc' or 'desc'"),
) -> ApplicationListResponse:
    """List and filter the authenticated user's job applications."""
    if sort_by not in VALID_SORT_FIELDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid sort_by field '{sort_by}'. Allowed values: {sorted(list(VALID_SORT_FIELDS))}",
        )

    if order.lower() not in ("asc", "desc"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Order must be either 'asc' or 'desc'",
        )

    items, total = application_service.list_applications(
        db,
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        search=search,
        statuses=status_filter,
        deadline_before=deadline_before,
        deadline_after=deadline_after,
        has_deadline=has_deadline,
        sort_by=sort_by,
        order=order,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return ApplicationListResponse(
        items=[ApplicationOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/board",
    response_model=BoardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Kanban board grouped by status column",
)
def get_board(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> BoardResponse:
    """Retrieve all applications grouped into Kanban columns (wishlist, applied, interview, offer, rejected)."""
    board_data = application_service.get_board(db, user_id=current_user.id)
    return BoardResponse(
        wishlist=[ApplicationOut.model_validate(x) for x in board_data["wishlist"]],
        applied=[ApplicationOut.model_validate(x) for x in board_data["applied"]],
        interview=[ApplicationOut.model_validate(x) for x in board_data["interview"]],
        offer=[ApplicationOut.model_validate(x) for x in board_data["offer"]],
        rejected=[ApplicationOut.model_validate(x) for x in board_data["rejected"]],
    )


@router.get(
    "/{application_id}",
    response_model=ApplicationOut,
    status_code=status.HTTP_200_OK,
    summary="Get application details by ID",
)
def get_application_by_id(
    application_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApplicationOut:
    """Retrieve a single application. Returns 404 if missing or belonging to another user."""
    app = application_service.get_application(db, user_id=current_user.id, app_id=application_id)
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    return ApplicationOut.model_validate(app)


@router.patch(
    "/{application_id}",
    response_model=ApplicationOut,
    status_code=status.HTTP_200_OK,
    summary="Update application details",
)
def update_application(
    application_id: uuid.UUID,
    app_update: ApplicationUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApplicationOut:
    """Partially update an application. Changing status moves it to the end of the new column."""
    updated = application_service.update_application(
        db, user_id=current_user.id, app_id=application_id, data=app_update
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    return ApplicationOut.model_validate(updated)


@router.delete(
    "/{application_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an application",
)
def delete_application(
    application_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Delete an application. Keeps column positions contiguous."""
    deleted = application_service.delete_application(
        db, user_id=current_user.id, app_id=application_id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )


@router.patch(
    "/{application_id}/move",
    response_model=ApplicationOut,
    status_code=status.HTTP_200_OK,
    summary="Move application to another status column or reorder within column",
)
def move_application(
    application_id: uuid.UUID,
    move_in: ApplicationMove,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApplicationOut:
    """Kanban drag-and-drop: updates column and position while keeping both columns contiguous."""
    moved = application_service.move_application(
        db,
        user_id=current_user.id,
        app_id=application_id,
        new_status=move_in.status,
        new_position=move_in.position,
    )
    if moved is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    return ApplicationOut.model_validate(moved)
