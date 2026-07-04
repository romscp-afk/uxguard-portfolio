"""Seed UXguard with demo data."""

import asyncio

from app.db.bootstrap import seed_if_empty
from app.db.session import init_db


async def seed() -> None:
    await init_db()
    await seed_if_empty()
    print("Seed complete. Login: demo@uxguard.io / demo1234")


if __name__ == "__main__":
    asyncio.run(seed())
