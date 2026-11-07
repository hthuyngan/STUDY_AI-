from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    displayName: str = Field(..., min_length=1, max_length=128)
    grade: Optional[str] = Field(None, max_length=32)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean.split("@")[-1] or len(clean.split("@")[0]) == 0:
            raise ValueError("Định dạng email không hợp lệ.")
        return clean

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v.strip()) < 8:
            raise ValueError("Mật khẩu phải chứa ít nhất 8 ký tự không rỗng.")
        return v



class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    displayName: Optional[str] = None
    grade: Optional[str] = None
    role: str = "learner"
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
