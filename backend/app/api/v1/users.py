from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import CaseStudy, CaseStudyStatus, User
from app.db.session import get_db
from app.schemas.domain import CaseStudyListItem, CaseStudyOut, UserProfileOut, UserPublicOut

router = APIRouter(prefix="/users", tags=["users"])


def _public_user(user: User) -> UserPublicOut:
    return UserPublicOut(
        id=user.id,
        username=user.username,
        name=user.name,
        title=user.title,
        bio=user.bio,
        avatar_url=user.avatar_url,
        contact_email=user.contact_email,
        location=user.location,
        cv_url=user.cv_url,
        social_links=user.social_links or {},
    )


def _author_summary(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "title": user.title,
        "avatar_url": user.avatar_url,
    }


@router.get("/{username}", response_model=UserProfileOut)
async def get_user_profile(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    cs_result = await db.execute(
        select(CaseStudy)
        .where(CaseStudy.author_id == user.id, CaseStudy.status == CaseStudyStatus.published)
        .order_by(CaseStudy.sort_order, CaseStudy.updated_at.desc())
    )
    studies = cs_result.scalars().all()

    return UserProfileOut(
        **_public_user(user).model_dump(),
        case_studies=[
            CaseStudyListItem.model_validate(cs)
            for cs in studies
        ],
        case_study_count=len(studies),
    )


@router.get("/{username}/case-studies", response_model=list[CaseStudyListItem])
async def list_user_case_studies(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    cs_result = await db.execute(
        select(CaseStudy)
        .where(CaseStudy.author_id == user.id, CaseStudy.status == CaseStudyStatus.published)
        .order_by(CaseStudy.sort_order, CaseStudy.updated_at.desc())
    )
    return cs_result.scalars().all()


@router.get("/{username}/case-studies/{slug}", response_model=CaseStudyOut)
async def get_user_case_study(username: str, slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    cs_result = await db.execute(
        select(CaseStudy)
        .options(selectinload(CaseStudy.attachments))
        .where(
            CaseStudy.author_id == user.id,
            CaseStudy.slug == slug,
            CaseStudy.status == CaseStudyStatus.published,
        )
    )
    case_study = cs_result.scalar_one_or_none()
    if not case_study:
        raise HTTPException(status_code=404, detail="Case study not found")
    return case_study
