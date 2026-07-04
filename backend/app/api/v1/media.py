import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import get_current_user
from app.db.models import MediaAsset, User
from app.db.session import get_db
from app.schemas.domain import MediaAssetOut, MediaUpdate

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"}
ALLOWED_DOC_TYPES = {"application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES


@router.get("", response_model=list[MediaAssetOut])
async def list_media(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(MediaAsset).order_by(MediaAsset.created_at.desc()))
    return result.scalars().all()


@router.post("/upload", response_model=MediaAssetOut)
async def upload_media(
    file: UploadFile = File(...),
    alt_text: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="File type not allowed")

    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_upload_size_mb}MB limit")

    ext = Path(file.filename or "file").suffix or ".bin"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = settings.upload_dir / filename
    dest.write_bytes(content)

    asset = MediaAsset(
        filename=filename,
        original_name=file.filename or filename,
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        url=f"/uploads/{filename}",
        alt_text=alt_text,
        uploaded_by_id=user.id,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset


@router.patch("/{media_id}", response_model=MediaAssetOut)
async def update_media(
    media_id: int,
    payload: MediaUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(MediaAsset).where(MediaAsset.id == media_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Media not found")
    if payload.alt_text is not None:
        asset.alt_text = payload.alt_text
    await db.commit()
    await db.refresh(asset)
    return asset


@router.delete("/{media_id}", status_code=204)
async def delete_media(
    media_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(MediaAsset).where(MediaAsset.id == media_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Media not found")
    file_path = settings.upload_dir / asset.filename
    if file_path.exists():
        file_path.unlink()
    await db.delete(asset)
    await db.commit()
