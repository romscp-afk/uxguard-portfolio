from fastapi import APIRouter

from app.api.v1 import auth, case_studies, feed, media, portfolio, users

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(feed.router)
router.include_router(users.router)
router.include_router(case_studies.router)
router.include_router(media.router)
router.include_router(portfolio.router)
