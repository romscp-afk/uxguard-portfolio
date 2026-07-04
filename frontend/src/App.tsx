import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminLayout } from "./components/layout/AdminLayout";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { CaseStudiesListPage } from "./pages/admin/CaseStudiesListPage";
import { CaseStudyEditorPage } from "./pages/admin/CaseStudyEditorPage";
import { MediaLibraryPage } from "./pages/admin/MediaLibraryPage";
import { ProfileSettingsPage } from "./pages/admin/ProfileSettingsPage";
import { CaseStudyDetailPage } from "./pages/public/CaseStudyDetailPage";
import { HomePage } from "./pages/public/HomePage";
import { UserPortfolioPage } from "./pages/public/UserPortfolioPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/u/:username" element={<UserPortfolioPage />} />
          <Route path="/u/:username/:slug" element={<CaseStudyDetailPage />} />

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="case-studies" element={<CaseStudiesListPage />} />
            <Route path="case-studies/new" element={<CaseStudyEditorPage />} />
            <Route path="case-studies/:id" element={<CaseStudyEditorPage />} />
            <Route path="media" element={<MediaLibraryPage />} />
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="settings" element={<Navigate to="/admin/profile" replace />} />
          </Route>

          <Route path="/case-studies/:slug" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
