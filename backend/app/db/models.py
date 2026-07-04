import enum
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    researcher = "researcher"


class CaseStudyStatus(str, enum.Enum):
    draft = "draft"
    published = "published"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cv_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    social_links: Mapped[dict] = mapped_column(JSON, default=dict)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.researcher)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    case_studies: Mapped[list["CaseStudy"]] = relationship(back_populates="author")
    media: Mapped[list["MediaAsset"]] = relationship(back_populates="uploaded_by")


class PortfolioSettings(Base):
    __tablename__ = "portfolio_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    site_title: Mapped[str] = mapped_column(String(255), default="UXguard Portfolio")
    tagline: Mapped[str] = mapped_column(String(500), default="UX Research Case Studies")
    hero_title: Mapped[str] = mapped_column(String(255), default="Evidence-driven UX research")
    hero_subtitle: Mapped[str] = mapped_column(Text, default="")
    about: Mapped[str] = mapped_column(Text, default="")
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    social_links: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CaseStudy(Base):
    __tablename__ = "case_studies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    subtitle: Mapped[str | None] = mapped_column(String(500), nullable=True)
    client: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duration: Mapped[str | None] = mapped_column(String(100), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    challenge: Mapped[str | None] = mapped_column(Text, nullable=True)
    methodology: Mapped[str | None] = mapped_column(Text, nullable=True)
    impact: Mapped[str | None] = mapped_column(Text, nullable=True)
    reflections: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    methods: Mapped[list] = mapped_column(JSON, default=list)
    metrics: Mapped[list] = mapped_column(JSON, default=list)
    content_blocks: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[CaseStudyStatus] = mapped_column(
        Enum(CaseStudyStatus), default=CaseStudyStatus.draft
    )
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    author: Mapped["User"] = relationship(back_populates="case_studies")
    attachments: Mapped[list["CaseStudyAttachment"]] = relationship(
        back_populates="case_study", cascade="all, delete-orphan"
    )


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    original_name: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    url: Mapped[str] = mapped_column(String(500))
    alt_text: Mapped[str | None] = mapped_column(String(500), nullable=True)
    uploaded_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    uploaded_by: Mapped["User"] = relationship(back_populates="media")


class CaseStudyAttachment(Base):
    __tablename__ = "case_study_attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_study_id: Mapped[int] = mapped_column(ForeignKey("case_studies.id"))
    title: Mapped[str] = mapped_column(String(255))
    file_url: Mapped[str] = mapped_column(String(500))
    file_type: Mapped[str] = mapped_column(String(50))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    case_study: Mapped["CaseStudy"] = relationship(back_populates="attachments")
