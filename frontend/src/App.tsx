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
import { SearchPage } from "./pages/public/SearchPage";
import { UserPortfolioPage } from "./pages/public/UserPortfolioPage";
import { NotificationsPage } from "./pages/admin/NotificationsPage";
import { ContactPage } from "./pages/public/ContactPage";
import { ContactInboxPage } from "./pages/admin/ContactInboxPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminUserDetailPage } from "./pages/admin/AdminUserDetailPage";
import { ProjectsListPage } from "./pages/admin/ProjectsListPage";
import { ProjectEditorPage } from "./pages/admin/ProjectEditorPage";
import { PortfolioBuilderPage } from "./pages/admin/PortfolioBuilderPage";
import { TemplatesPage } from "./pages/admin/TemplatesPage";
import { AnalyticsPage } from "./pages/admin/AnalyticsPage";
import { AiHubPage } from "./pages/admin/ai/AiHubPage";
import { AiWorkspacePage } from "./pages/admin/ai/AiWorkspacePage";
import { AiHistoryPage } from "./pages/admin/ai/AiHistoryPage";
import { AiSavedPage } from "./pages/admin/ai/AiSavedPage";
import { PricingPage } from "./pages/public/PricingPage";
import { UpgradePage } from "./pages/admin/UpgradePage";
import { BillingSettingsPage } from "./pages/admin/BillingSettingsPage";
import { MockCheckoutPage } from "./pages/admin/MockCheckoutPage";
import { CheckoutCancelledPage, CheckoutSuccessPage } from "./pages/admin/CheckoutResultPages";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/search" element={<SearchPage />} />
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
