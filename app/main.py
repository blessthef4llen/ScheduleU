from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app import user_repository as repo

app = FastAPI(title="ScheduleU Backend")

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = None

class UserResponse(BaseModel):
    id: int 
    email: EmailStr
    name: Optional[str] = None
    role: str

class LoginRequest(BaseModel):
    email: EmailStr 
    password: str

class UpdateEmailRequest(BaseModel):
    user_id: int
    new_email: EmailStr

class DeleteUserRequest(BaseModel):
    user_id: int 

@app.post("/register", response_model=UserResponse)
def register_user(payload: RegisterRequest):
    existing = repo.get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = repo.create_user(payload.email, payload.password, payload.name)
    return UserResponse(**user)

@app.post("/login", response_model=UserResponse)
def Login(payload: LoginRequest):
    user = repo.authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return UserResponse(**user)

@app.put("/user/email", response_model=UserResponse)
def update_email(payload: UpdateEmailRequest):
    try:
        user = repo.update_user_email(payload.user_id, payload.new_email)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(**user)

@app.delete("/user")
def delete_user(payload: DeleteUserRequest):
    repo.delete_user(payload.user_id)
    return {"Status": "ok"}


