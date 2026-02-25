from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SignupRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    created_at: datetime


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
