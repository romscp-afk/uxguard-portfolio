import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.db.models import User, UserRole
from app.db.session import get_db
from app.schemas.domain import LoginRequest, RegisterResponse, TokenResponse, UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-") or str(uuid.uuid4())[:8]


async def _unique_username(db: AsyncSession, base: str) -> str:
    candidate = slugify(base)
    counter = 1
    while True:
        result = await db.execute(select(User).where(User.username == candidate))
        if not result.scalar_one_or_none():
            return candidate
        candidate = f"{slugify(base)}-{counter}"
        counter += 1


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        name=user.name,
        title=user.title,
        bio=user.bio,
        avatar_url=user.avatar_url,
        contact_email=user.contact_email,
        location=user.location,
        cv_url=user.cv_url,
        social_links=user.social_links or {},
        role=user.role.value,
        portfolio_url=f"/u/{user.username}",
    )


@router.post("/register", response_model=RegisterResponse)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    username = payload.username or await _unique_username(db, payload.name)
    if payload.username:
        taken = await db.execute(select(User).where(User.username == username))
        if taken.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        username=username,
        title=payload.title,
        role=UserRole.researcher,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    user_out = _user_out(user)
    return RegisterResponse(
        access_token=create_access_token(user.id, user.email),
        user=user_out,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return _user_out(user)


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    if "username" in data and data["username"]:
        taken = await db.execute(
            select(User).where(User.username == data["username"], User.id != user.id)
        )
        if taken.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken")
    for field, value in data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return _user_out(user)
