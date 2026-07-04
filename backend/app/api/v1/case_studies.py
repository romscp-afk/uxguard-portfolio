import re
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.db.models import CaseStudy, CaseStudyAttachment, CaseStudyStatus, User
from app.db.session import get_db
from app.schemas.domain import (
    AttachmentOut,
    CaseStudyCreate,
    CaseStudyListItem,
    CaseStudyOut,
    CaseStudyUpdate,
)

router = APIRouter(prefix="/case-studies", tags=["case-studies"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-") or str(uuid.uuid4())[:8]


async def _unique_slug(db: AsyncSession, base: str, exclude_id: int | None = None) -> str:
    slug = slugify(base)
    candidate = slug
    counter = 1
    while True:
        query = select(CaseStudy).where(CaseStudy.slug == candidate)
        if exclude_id:
            query = query.where(CaseStudy.id != exclude_id)
        result = await db.execute(query)
        if not result.scalar_one_or_none():
            return candidate
        candidate = f"{slug}-{counter}"
        counter += 1


def _serialize_metrics(metrics: list) -> list:
    return [m if isinstance(m, dict) else m.model_dump() for m in metrics]


def _serialize_blocks(blocks: list) -> list:
    return [b if isinstance(b, dict) else b.model_dump() for b in blocks]


@router.get("", response_model=list[CaseStudyListItem])
async def list_case_studies(
    status_filter: str | None = Query(None, alias="status"),
    featured: bool | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(CaseStudy).order_by(CaseStudy.sort_order, CaseStudy.updated_at.desc())
    if status_filter:
        query = query.where(CaseStudy.status == CaseStudyStatus(status_filter))
    else:
        query = query.where(CaseStudy.status == CaseStudyStatus.published)
    if featured is not None:
        query = query.where(CaseStudy.featured == featured)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/admin/all", response_model=list[CaseStudyListItem])
async def admin_list_case_studies(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CaseStudy).order_by(CaseStudy.sort_order, CaseStudy.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/{slug}", response_model=CaseStudyOut)
async def get_case_study(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CaseStudy)
        .options(selectinload(CaseStudy.attachments))
        .where(CaseStudy.slug == slug, CaseStudy.status == CaseStudyStatus.published)
    )
    case_study = result.scalar_one_or_none()
    if not case_study:
        raise HTTPException(status_code=404, detail="Case study not found")
    return case_study


@router.get("/admin/{case_id}", response_model=CaseStudyOut)
async def admin_get_case_study(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CaseStudy)
        .options(selectinload(CaseStudy.attachments))
        .where(CaseStudy.id == case_id)
    )
    case_study = result.scalar_one_or_none()
    if not case_study:
        raise HTTPException(status_code=404, detail="Case study not found")
    return case_study


@router.post("", response_model=CaseStudyOut, status_code=status.HTTP_201_CREATED)
async def create_case_study(
    payload: CaseStudyCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    slug = payload.slug or await _unique_slug(db, payload.title)
    status_val = CaseStudyStatus(payload.status)
    case_study = CaseStudy(
        slug=slug,
        title=payload.title,
        subtitle=payload.subtitle,
        client=payload.client,
        project_type=payload.project_type,
        role=payload.role,
        duration=payload.duration,
        summary=payload.summary,
        challenge=payload.challenge,
        methodology=payload.methodology,
        impact=payload.impact,
        reflections=payload.reflections,
        cover_image=payload.cover_image,
        methods=payload.methods,
        metrics=_serialize_metrics(payload.metrics),
        content_blocks=_serialize_blocks(payload.content_blocks),
        status=status_val,
        featured=payload.featured,
        sort_order=payload.sort_order,
        author_id=user.id,
        published_at=datetime.now(UTC) if status_val == CaseStudyStatus.published else None,
    )
    db.add(case_study)
    await db.commit()
    await db.refresh(case_study)
    return case_study


@router.patch("/{case_id}", response_model=CaseStudyOut)
async def update_case_study(
    case_id: int,
    payload: CaseStudyUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CaseStudy)
        .options(selectinload(CaseStudy.attachments))
        .where(CaseStudy.id == case_id)
    )
    case_study = result.scalar_one_or_none()
    if not case_study:
        raise HTTPException(status_code=404, detail="Case study not found")

    data = payload.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"]:
        data["slug"] = await _unique_slug(db, data["slug"], exclude_id=case_id)
    if "status" in data:
        new_status = CaseStudyStatus(data["status"])
        if new_status == CaseStudyStatus.published and not case_study.published_at:
            case_study.published_at = datetime.now(UTC)
        data["status"] = new_status
    if "metrics" in data and data["metrics"] is not None:
        data["metrics"] = _serialize_metrics(data["metrics"])
    if "content_blocks" in data and data["content_blocks"] is not None:
        data["content_blocks"] = _serialize_blocks(data["content_blocks"])

    for field, value in data.items():
        setattr(case_study, field, value)

    await db.commit()
    await db.refresh(case_study)
    return case_study


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case_study(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(CaseStudy).where(CaseStudy.id == case_id))
    case_study = result.scalar_one_or_none()
    if not case_study:
        raise HTTPException(status_code=404, detail="Case study not found")
    await db.delete(case_study)
    await db.commit()


@router.post("/{case_id}/attachments", response_model=AttachmentOut)
async def add_attachment(
    case_id: int,
    title: str,
    file_url: str,
    file_type: str,
    size_bytes: int = 0,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(CaseStudy).where(CaseStudy.id == case_id))
    case_study = result.scalar_one_or_none()
    if not case_study:
        raise HTTPException(status_code=404, detail="Case study not found")

    attachment = CaseStudyAttachment(
        case_study_id=case_id,
        title=title,
        file_url=file_url,
        file_type=file_type,
        size_bytes=size_bytes,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return attachment


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CaseStudyAttachment).where(CaseStudyAttachment.id == attachment_id)
    )
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    await db.delete(attachment)
    await db.commit()
