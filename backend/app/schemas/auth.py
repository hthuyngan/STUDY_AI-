from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    displayName: str = Field(..., min_length=1, max_length=128)
    grade: Optional[str] = Field(None, max_length=32)


class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    displayName: Optional[str] = None
    grade: Optional[str] = None
    createdAt: datetime

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class AuthResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    expiresIn: int
    user: UserResponse


class TokenRefreshResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    expiresIn: int
    user: Optional[UserResponse] = None
