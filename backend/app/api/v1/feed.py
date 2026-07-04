from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CaseStudy, CaseStudyStatus, User
from app.db.session import get_db
from app.schemas.domain import FeedCaseStudyItem

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("/case-studies", response_model=list[FeedCaseStudyItem])
async def discover_feed(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CaseStudy, User)
        .join(User, CaseStudy.author_id == User.id)
        .where(CaseStudy.status == CaseStudyStatus.published)
        .order_by(CaseStudy.published_at.desc(), CaseStudy.updated_at.desc())
    )
    items = []
    for case_study, user in result.all():
        items.append(
            FeedCaseStudyItem(
                id=case_study.id,
                slug=case_study.slug,
                title=case_study.title,
                subtitle=case_study.subtitle,
                client=case_study.client,
                cover_image=case_study.cover_image,
                methods=case_study.methods or [],
                featured=case_study.featured,
                updated_at=case_study.updated_at,
                published_at=case_study.published_at,
                author={
                    "id": user.id,
                    "username": user.username,
                    "name": user.name,
                    "title": user.title,
                    "avatar_url": user.avatar_url,
                },
            )
        )
    return items
