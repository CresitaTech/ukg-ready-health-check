from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import List
import secrets

import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


def require_manager(current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Manager access required")
    return current_user


@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    # Validate role — only allow csm or manager
    role = user.role if user.role in ("csm", "manager") else "csm"
    new_user = models.User(name=user.name, email=user.email, password_hash=hashed_password, role=role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login")
def login(response: Response, user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not user or not auth.verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
    }


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@router.get("/users", response_model=List[schemas.UserResponse])
def list_users(
    _manager: models.User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Manager-only: list all registered CSM users."""
    return db.query(models.User).all()


@router.post("/users/{user_id}/promote")
def promote_to_manager(
    user_id: int,
    _manager: models.User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Manager-only: promote a CSM user to manager role."""
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.role = "manager"
    db.commit()
    return {"detail": f"{target.name} has been promoted to manager"}


@router.post("/users/{user_id}/demote")
def demote_to_csm(
    user_id: int,
    manager: models.User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Manager-only: demote a manager back to CSM."""
    if manager.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot demote yourself")
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.role = "csm"
    db.commit()
    return {"detail": f"{target.name} has been demoted to CSM"}


@router.post("/forgot-password")
def forgot_password(
    req: schemas.ForgotPasswordRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    from email_service import send_password_reset_email
    
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        # Return success even if not found to prevent email enumeration
        return {"detail": "If an account exists with that email, a password reset link has been sent."}
        
    token = secrets.token_urlsafe(32)
    user.reset_password_token = token
    user.reset_password_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    
    background_tasks.add_task(
        send_password_reset_email,
        email=user.email,
        name=user.name,
        token=token
    )
    
    return {"detail": "If an account exists with that email, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.reset_password_token == req.token).first()
    
    if not user or not user.reset_password_expires or user.reset_password_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    hashed_password = auth.get_password_hash(req.new_password)
    user.password_hash = hashed_password
    user.reset_password_token = None
    user.reset_password_expires = None
    db.commit()
    
    return {"detail": "Password has been reset successfully"}
