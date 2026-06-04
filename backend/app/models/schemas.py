from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# 회원가입 요청
class UserCreate(BaseModel):
    email: str
    username: str
    password: str

# 로그인 요청
class UserLogin(BaseModel):
    email: str
    password: str

# 유저 응답 (비밀번호 제외)
class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# 토큰 응답
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
