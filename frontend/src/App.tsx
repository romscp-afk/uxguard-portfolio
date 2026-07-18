import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminLayout } from "./components/layout/AdminLayout";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminForgotPasswordPage } from "./pages/admin/AdminForgotPasswordPage";
import { AdminRegisterPage } from "./pages/admin/AdminRegisterPage";
import { AdminResetPasswordPage } from "./pages/admin/AdminResetPasswordPage";
import { CaseStudiesListPage } from "./pages/admin/CaseStudiesListPage";
import { CaseStudyEditorPage } from "./pages/admin/CaseStudyEditorPage";
import { MediaLibraryPage } from "./pages/admin/MediaLibraryPage";
import { CaseStudyPreviewPage } from "./pages/admin/CaseStudyPreviewPage";
import { ProfileSettingsPage } from "./pages/admin/ProfileSettingsPage";
import { AboutPage } from "./pages/public/AboutPage";
import { CaseStudyDetailPage } from "./pages/public/CaseStudyDetailPage";
import { HomePage } from "./pages/public/HomePage";
import { DiscoverPage } from "./pages/public/DiscoverPage";
import { UserPortfolioPage } from "./pages/public/UserPortfolioPage";
import { NotificationsPage } from "./pages/admin/NotificationsPage";
import { ContactPage } from "./pages/public/ContactPage";
import { ContactInboxPage } from "./pages/admin/ContactInboxPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminUserDetailPage } from "./pages/admin/AdminUserDetailPage";
import { ProjectsListPage } from "./pages/admin/ProjectsListPage";
import { ProjectEditorPage } from "./pages/admin/ProjectEditorPage";
import { PortfolioBuilderPage } from "./pages/admin/PortfolioBuilderPage";
import { ResumeDashboardPage } from "./pages/admin/ResumeDashboardPage";
import { ResumeCreatePage } from "./pages/admin/ResumeCreatePage";
import { ResumeEditorPage } from "./pages/admin/ResumeEditorPage";
import { ResumeReviewPage } from "./pages/admin/ResumeReviewPage";
import { CareerTimelinePage } from "./pages/admin/CareerTimelinePage";
import { CareerTimelineEntryPage } from "./pages/admin/CareerTimelineEntryPage";
import { EmployerWorkspacePage } from "./pages/admin/EmployerWorkspacePage";
import { EmployerJobEditorPage } from "./pages/admin/EmployerJobEditorPage";
import { EmployerCompanyPage, EmployerTeamPage } from "./pages/admin/EmployerCompanyPage";
import {
  EmployerApplicationsPage,
  EmployerApplicationDetailPage,
} from "./pages/admin/EmployerApplicationsPage";
import { JobsBrowsePage } from "./pages/admin/JobsBrowsePage";
import { JobDetailPage } from "./pages/admin/JobDetailPage";
import { MyApplicationsPage } from "./pages/admin/MyApplicationsPage";
import { ApplicationDetailPage, SavedJobsPage } from "./pages/admin/ApplicationDetailPage";
import { TemplatesPage } from "./pages/admin/TemplatesPage";
import { AnalyticsPage } from "./pages/admin/AnalyticsPage";
import { AiHubPage } from "./pages/admin/ai/AiHubPage";
import { AiWorkspacePage } from "./pages/admin/ai/AiWorkspacePage";
import { AiHistoryPage } from "./pages/admin/ai/AiHistoryPage";
import { AiSavedPage } from "./pages/admin/ai/AiSavedPage";
import { PricingPage } from "./pages/public/PricingPage";
import { LegalPage } from "./pages/public/LegalPage";
import { UpgradePage } from "./pages/admin/UpgradePage";
import { BillingSettingsPage } from "./pages/admin/BillingSettingsPage";
import { MockCheckoutPage } from "./pages/admin/MockCheckoutPage";
import { CheckoutCancelledPage, CheckoutSuccessPage } from "./pages/admin/CheckoutResultPages";
import { PaypalReturnPage } from "./pages/admin/PaypalReturnPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/search" element={<Navigate to="/discover" replace />} />
          <Route path="/u/:username" element={<UserPortfolioPage />} />
          <Route path="/u/:username/:slug" element={<CaseStudyDetailPage />} />

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/register" element={<AdminRegisterPage />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
          <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />
          <Route path="/admin/case-studies/:id/preview" element={<CaseStudyPreviewPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="billing" element={<BillingSettingsPage />} />
            <Route path="upgrade" element={<UpgradePage />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/new" element={<ProjectEditorPage />} />
            <Route path="projects/:id" element={<ProjectEditorPage />} />
            <Route path="portfolio-builder" element={<PortfolioBuilderPage />} />
            <Route path="resume-builder" element={<ResumeDashboardPage />} />
            <Route path="resume-builder/new" element={<ResumeCreatePage />} />
            <Route path="resume-builder/:id/review" element={<ResumeReviewPage />} />
            <Route path="resume-builder/:id" element={<ResumeEditorPage />} />
            <Route path="career-timeline" element={<CareerTimelinePage />} />
            <Route path="career-timeline/new" element={<CareerTimelineEntryPage />} />
            <Route path="career-timeline/:entryId" element={<CareerTimelineEntryPage />} />
            <Route path="jobs" element={<JobsBrowsePage />} />
            <Route path="jobs/:jobId" element={<JobDetailPage />} />
            <Route path="applications" element={<MyApplicationsPage />} />
            <Route path="applications/:applicationId" element={<ApplicationDetailPage />} />
            <Route path="saved-jobs" element={<SavedJobsPage />} />
            <Route path="employer" element={<EmployerWorkspacePage />} />
            <Route path="employer/company/:companyId" element={<EmployerCompanyPage />} />
            <Route path="employer/company/:companyId/team" element={<EmployerTeamPage />} />
            <Route path="employer/jobs/new" element={<EmployerJobEditorPage />} />
            <Route path="employer/jobs/:jobId" element={<EmployerJobEditorPage />} />
            <Route path="employer/jobs/:jobId/applications" element={<EmployerApplicationsPage />} />
            <Route path="employer/applications/:applicationId" element={<EmployerApplicationDetailPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="ai" element={<AiHubPage />} />
            <Route path="ai/history" element={<AiHistoryPage />} />
            <Route path="ai/saved" element={<AiSavedPage />} />
            <Route path="ai/:assistantType" element={<AiWorkspacePage />} />
            <Route path="case-studies" element={<CaseStudiesListPage />} />
            <Route path="case-studies/new" element={<CaseStudyEditorPage />} />
            <Route path="case-studies/:id" element={<CaseStudyEditorPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="media" element={<MediaLibraryPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:id" element={<AdminUserDetailPage />} />
            <Route path="contact-inbox" element={<ContactInboxPage />} />
            <Route path="settings" element={<Navigate to="/admin/profile" replace />} />
            <Route path="settings/billing" element={<Navigate to="/admin/billing" replace />} />
          </Route>

          <Route path="/upgrade" element={<Navigate to="/admin/upgrade" replace />} />
          <Route path="/checkout/mock" element={<AdminLayout />}>
            <Route index element={<MockCheckoutPage />} />
          </Route>
          <Route path="/checkout/paypal/return" element={<AdminLayout />}>
            <Route index element={<PaypalReturnPage />} />
          </Route>
          <Route path="/checkout/success" element={<AdminLayout />}>
            <Route index element={<CheckoutSuccessPage />} />
          </Route>
          <Route path="/checkout/cancelled" element={<AdminLayout />}>
            <Route index element={<CheckoutCancelledPage />} />
          </Route>

          <Route path="/case-studies/:slug" element={<Navigate to="/discover" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
