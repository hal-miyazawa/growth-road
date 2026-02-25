from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import crud
from database import get_db
from dependencies import create_access_token, get_current_user_id, get_password_hash, verify_password
from schemas import AuthUserRead, LoginRequest, LoginResponse, SignupRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthUserRead, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    exists = crud.get_user_by_email(db, email)
    if exists:
        raise HTTPException(status_code=409, detail="Email already exists")

    try:
        return crud.create_user(db, email=email, password_hash=get_password_hash(payload.password))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already exists")


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = crud.get_user_by_email(db, email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return LoginResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=AuthUserRead)
def me(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    user = crud.get_user_by_id(db, current_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
