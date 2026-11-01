from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import ChangePasswordRequest, UserOut, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Get profile details of the authenticated user",
)
def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserOut:
    """Return the profile information of the currently authenticated user."""
    return UserOut.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Update profile information for the authenticated user",
)
def update_current_user_profile(
    user_update: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserOut:
    """Update profile fields such as full name."""
    update_data = user_update.model_dump(exclude_unset=True)
    updated_user = user_service.update_user(db, current_user, update_data)
    return UserOut.model_validate(updated_user)


@router.post(
    "/me/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change the current user's password",
)
def change_password(
    pwd_in: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Verify current password and set a new password. Returns 204 on success."""
    success = user_service.change_user_password(
        db,
        user=current_user,
        current_password=pwd_in.current_password,
        new_password=pwd_in.new_password,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )
