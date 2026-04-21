from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True

class SubmissionBase(BaseModel):
    customer_name: Optional[str] = "Untitled"
    form_data: Optional[str] = "{}"
    current_section: Optional[int] = 1
    status: Optional[str] = "draft"

class SubmissionCreate(SubmissionBase):
    pass

class SubmissionUpdate(SubmissionBase):
    pdf_base64: Optional[str] = None

class SubmissionResponse(SubmissionBase):
    id: int
    user_id: int
    last_updated: datetime

    class Config:
        from_attributes = True
