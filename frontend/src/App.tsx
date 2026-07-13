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
import { ProjectsListPage } from "./pages/admin/ProjectsListPage";
import { ProjectEditorPage } from "./pages/admin/ProjectEditorPage";
import { PortfolioBuilderPage } from "./pages/admin/PortfolioBuilderPage";
import { TemplatesPage } from "./pages/admin/TemplatesPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/about" element={<AboutPage />} />
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
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/new" element={<ProjectEditorPage />} />
            <Route path="projects/:id" element={<ProjectEditorPage />} />
            <Route path="portfolio-builder" element={<PortfolioBuilderPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="case-studies" element={<CaseStudiesListPage />} />
            <Route path="case-studies/new" element={<CaseStudyEditorPage />} />
            <Route path="case-studies/:id" element={<CaseStudyEditorPage />} />
            <Route path="media" element={<MediaLibraryPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="contact-inbox" element={<ContactInboxPage />} />
            <Route path="settings" element={<Navigate to="/admin/profile" replace />} />
          </Route>

          <Route path="/case-studies/:slug" element={<Navigate to="/discover" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
