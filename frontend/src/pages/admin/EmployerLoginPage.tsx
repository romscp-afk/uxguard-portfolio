import { Navigate } from "react-router-dom";

/** Employer login is paused during the portfolio launch. */
export function EmployerLoginPage() {
  return <Navigate to="/admin/login" replace />;
}
