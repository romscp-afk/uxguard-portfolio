"""Bootstrap demo data when the database is empty."""

from datetime import UTC, datetime

from sqlalchemy import select

from app.core.security import hash_password
from app.db.models import CaseStudy, CaseStudyStatus, PortfolioSettings, User, UserRole
from app.db.session import SessionLocal


async def seed_if_empty() -> None:
    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "demo@uxguard.io"))
        if result.scalar_one_or_none():
            return

        user = User(
            email="demo@uxguard.io",
            password_hash=hash_password("demo1234"),
            name="Alex Rivera",
            username="alex-rivera",
            title="Senior UX Researcher",
            bio="I help product teams make evidence-based decisions through mixed-methods research.",
            contact_email="alex@uxguard.io",
            social_links={"linkedin": "https://linkedin.com/in/alexrivera"},
            role=UserRole.admin,
        )
        db.add(user)

        user2 = User(
            email="jordan@uxguard.io",
            password_hash=hash_password("demo1234"),
            name="Jordan Kim",
            username="jordan-kim",
            title="UX Research Lead",
            bio="Mixed-methods researcher focused on B2B SaaS onboarding and activation.",
            contact_email="jordan@uxguard.io",
            social_links={"linkedin": "https://linkedin.com/in/jordankim"},
            role=UserRole.researcher,
        )
        db.add(user2)
        await db.flush()

        db.add(
            PortfolioSettings(
                site_title="UXguard Portfolio",
                tagline="Evidence-driven UX research case studies",
                hero_title="Turning user insights into product impact",
                hero_subtitle=(
                    "A portfolio management platform for UX researchers to showcase "
                    "case studies, research reports, and measurable outcomes."
                ),
                about=(
                    "Discover UX research case studies from researchers worldwide. "
                    "Publish your work and share a personal portfolio link for your CV."
                ),
                contact_email="alex@uxguard.io",
                social_links={"linkedin": "https://linkedin.com", "twitter": "https://twitter.com"},
            )
        )

        case_studies = [
            CaseStudy(
                slug="checkout-usability-study",
                title="Checkout Usability Study",
                subtitle="Reducing cart abandonment through moderated usability testing",
                client="FinFlow",
                project_type="B2B SaaS",
                role="Lead UX Researcher",
                duration="6 weeks",
                summary=(
                    "A mixed-methods study to understand why enterprise users abandoned "
                    "checkout at the payment step and validate redesign hypotheses."
                ),
                challenge=(
                    "Cart abandonment at payment was 34% above industry benchmark. "
                    "Product suspected UX friction but lacked evidence on root causes."
                ),
                methodology=(
                    "8 moderated usability sessions, 120-session analytics review, "
                    "and 5 stakeholder interviews. Used think-aloud protocol with task-based scenarios."
                ),
                impact=(
                    "Redesign shipped in Q2. Payment-step completion improved 22%, "
                    "support tickets for billing dropped 18% in 90 days."
                ),
                reflections=(
                    "Recruiting enterprise admins took longer than expected. "
                    "Next time I'd start recruitment in parallel with study design."
                ),
                cover_image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
                methods=["Usability Testing", "Analytics Review", "Stakeholder Interviews"],
                metrics=[
                    {"label": "Completion lift", "value": "+22%", "description": "Payment step"},
                    {"label": "Support reduction", "value": "-18%", "description": "Billing tickets"},
                    {"label": "Sessions", "value": "8", "description": "Moderated tests"},
                ],
                content_blocks=[
                    {
                        "id": "b1",
                        "type": "text",
                        "data": {
                            "heading": "Research Goals",
                            "body": "Identify friction points in the checkout flow and prioritize fixes by severity and frequency.",
                        },
                    },
                    {
                        "id": "b2",
                        "type": "quote",
                        "data": {
                            "text": "I wasn't sure if my card would be charged immediately or after the trial.",
                            "attribution": "Participant P4, Enterprise Admin",
                        },
                    },
                ],
                status=CaseStudyStatus.published,
                featured=True,
                sort_order=1,
                author_id=user.id,
                published_at=datetime.now(UTC),
            ),
            CaseStudy(
                slug="onboarding-diary-study",
                title="Onboarding Diary Study",
                subtitle="Understanding first-week activation for new mobile users",
                client="HealthTrack",
                project_type="Consumer Mobile",
                role="UX Researcher",
                duration="4 weeks",
                summary=(
                    "A 7-day diary study with 20 new users to map onboarding confusion "
                    "and identify activation blockers."
                ),
                challenge="Day-7 retention was 41%. Product needed qualitative context behind early drop-off patterns.",
                methodology="Diary study with daily prompts, unmoderated screen recordings, and follow-up interviews.",
                impact="Day-7 retention improved from 41% to 53% over two releases.",
                reflections="Daily prompts worked well; shorter mobile tasks outperformed long-form entries.",
                cover_image="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80",
                methods=["Diary Study", "Unmoderated Testing", "Interviews"],
                metrics=[
                    {"label": "Day-7 retention", "value": "+12pts", "description": "After 2 releases"},
                    {"label": "Participants", "value": "20", "description": "Diary cohort"},
                ],
                content_blocks=[],
                status=CaseStudyStatus.published,
                featured=True,
                sort_order=2,
                author_id=user.id,
                published_at=datetime.now(UTC),
            ),
            CaseStudy(
                slug="enterprise-admin-research",
                title="Enterprise Admin Research",
                subtitle="Mapping admin workflows for multi-tenant SaaS",
                client="CloudOps",
                project_type="B2B SaaS",
                role="Lead Researcher",
                duration="6 weeks",
                summary=(
                    "Contextual inquiry and workflow mapping with IT admins "
                    "to redesign permission and audit tooling."
                ),
                challenge="Admins spent 40+ minutes on routine permission changes with high error rates.",
                methodology="Contextual inquiry, service blueprinting, and prototype validation.",
                impact="Admin task time reduced by 58% after permission model redesign.",
                reflections="Shadowing in production environments surfaced edge cases surveys missed.",
                cover_image="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80",
                methods=["Contextual Inquiry", "Workflow Mapping", "Prototype Testing"],
                metrics=[
                    {"label": "Task time", "value": "-58%", "description": "Permission changes"},
                    {"label": "Admins", "value": "14", "description": "Interviewed"},
                ],
                content_blocks=[],
                status=CaseStudyStatus.published,
                featured=False,
                sort_order=1,
                author_id=user2.id,
                published_at=datetime.now(UTC),
            ),
        ]
        db.add_all(case_studies)
        await db.commit()
