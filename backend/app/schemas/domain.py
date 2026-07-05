from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str
    username: str | None = None
    title: str | None = None


class AuthorSummary(BaseModel):
    id: int
    username: str
    name: str
    title: str | None = None
    avatar_url: str | None = None


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    name: str
    title: str | None
    bio: str | None
    avatar_url: str | None
    contact_email: str | None = None
    location: str | None = None
    cv_url: str | None = None
    social_links: dict[str, str] = Field(default_factory=dict)
    role: str
    portfolio_url: str | None = None

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserPublicOut(BaseModel):
    id: int
    username: str
    name: str
    title: str | None
    bio: str | None
    avatar_url: str | None
    contact_email: str | None = None
    location: str | None = None
    cv_url: str | None = None
    social_links: dict[str, str] = Field(default_factory=dict)


class UserProfileOut(UserPublicOut):
    case_studies: list["CaseStudyListItem"] = Field(default_factory=list)
    case_study_count: int = 0


class UserUpdate(BaseModel):
    name: str | None = None
    username: str | None = None
    title: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    contact_email: str | None = None
    location: str | None = None
    cv_url: str | None = None
    social_links: dict[str, str] | None = None


class MetricItem(BaseModel):
    label: str
    value: str
    description: str | None = None


class ContentBlock(BaseModel):
    id: str
    type: str
    data: dict[str, Any] = Field(default_factory=dict)


class AttachmentOut(BaseModel):
    id: int
    title: str
    file_url: str
    file_type: str
    size_bytes: int

    model_config = {"from_attributes": True}


class CaseStudyBase(BaseModel):
    title: str
    subtitle: str | None = None
    client: str | None = None
    project_type: str | None = None
    role: str | None = None
    duration: str | None = None
    summary: str | None = None
    challenge: str | None = None
    methodology: str | None = None
    impact: str | None = None
    reflections: str | None = None
    cover_image: str | None = None
    methods: list[str] = Field(default_factory=list)
    metrics: list[MetricItem] = Field(default_factory=list)
    content_blocks: list[ContentBlock] = Field(default_factory=list)
    featured: bool = False
    sort_order: int = 0


class CaseStudyCreate(CaseStudyBase):
    slug: str | None = None
    status: str = "draft"


class CaseStudyUpdate(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    slug: str | None = None
    client: str | None = None
    project_type: str | None = None
    role: str | None = None
    duration: str | None = None
    summary: str | None = None
    challenge: str | None = None
    methodology: str | None = None
    impact: str | None = None
    reflections: str | None = None
    cover_image: str | None = None
    methods: list[str] | None = None
    metrics: list[MetricItem] | None = None
    content_blocks: list[ContentBlock] | None = None
    status: str | None = None
    featured: bool | None = None
    sort_order: int | None = None


class CaseStudyOut(CaseStudyBase):
    id: int
    slug: str
    status: str
    author_id: int
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None
    attachments: list[AttachmentOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class CaseStudyListItem(BaseModel):
    id: int
    slug: str
    title: str
    subtitle: str | None
    client: str | None
    cover_image: str | None
    methods: list[str]
    featured: bool
    status: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class FeedCaseStudyItem(BaseModel):
    id: int
    slug: str
    title: str
    subtitle: str | None
    client: str | None
    cover_image: str | None
    methods: list[str]
    featured: bool
    updated_at: datetime
    published_at: datetime | None
    author: AuthorSummary


class PortfolioSettingsOut(BaseModel):
    site_title: str
    tagline: str
    hero_title: str
    hero_subtitle: str
    about: str
    contact_email: str | None
    social_links: dict[str, str]

    model_config = {"from_attributes": True}


class PortfolioSettingsUpdate(BaseModel):
    site_title: str | None = None
    tagline: str | None = None
    hero_title: str | None = None
    hero_subtitle: str | None = None
    about: str | None = None
    contact_email: str | None = None
    social_links: dict[str, str] | None = None


class MediaAssetOut(BaseModel):
    id: int
    filename: str
    original_name: str
    mime_type: str
    size_bytes: int
    url: str
    alt_text: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MediaUpdate(BaseModel):
    alt_text: str | None = None
