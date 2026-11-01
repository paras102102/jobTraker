import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User, UserRole
from app.schemas.user import AdminUserUpdate, PaginatedUsersResponse, UserOut
from app.services import user_service

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get(
    "/users",
    response_model=PaginatedUsersResponse,
    status_code=status.HTTP_200_OK,
    summary="List all users with search and pagination (Admin only)",
)
def list_users(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for email or name"),
) -> PaginatedUsersResponse:
    """Retrieve users matching search query with pagination."""
    items, total = user_service.list_users(
        db, page=page, page_size=page_size, search=search
    )
    return PaginatedUsersResponse(
        items=[UserOut.model_validate(u) for u in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch(
    "/users/{user_id}",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Update user status or role (Admin only)",
)
def update_user_status_or_role(
    user_id: uuid.UUID,
    update_in: AdminUserUpdate,
    admin_user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> UserOut:
    """Update user is_active and/or role. Prevents self-deactivation or self-demotion."""
    target_user = user_service.get_by_id(db, user_id=user_id)
    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent an admin from deactivating or demoting themselves
    if target_user.id == admin_user.id:
        if update_in.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot deactivate their own account",
            )
        if update_in.role is not None and update_in.role != UserRole.admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot demote their own account",
            )

    update_data = update_in.model_dump(exclude_unset=True)
    updated_user = user_service.update_user(db, target_user, update_data)
    return UserOut.model_validate(updated_user)
