from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.models import PortfolioSettings, User
from app.db.session import get_db
from app.schemas.domain import PortfolioSettingsOut, PortfolioSettingsUpdate

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


async def _get_or_create_settings(db: AsyncSession) -> PortfolioSettings:
    result = await db.execute(select(PortfolioSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = PortfolioSettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.get("/settings", response_model=PortfolioSettingsOut)
async def get_portfolio_settings(db: AsyncSession = Depends(get_db)):
    return await _get_or_create_settings(db)


@router.patch("/settings", response_model=PortfolioSettingsOut)
async def update_portfolio_settings(
    payload: PortfolioSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    settings = await _get_or_create_settings(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    await db.commit()
    await db.refresh(settings)
    return settings
