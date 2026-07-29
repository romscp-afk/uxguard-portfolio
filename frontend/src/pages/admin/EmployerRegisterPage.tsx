import { Navigate } from "react-router-dom";

/** Employer registration is paused during the portfolio launch. */
export function EmployerRegisterPage() {
  return <Navigate to="/admin/register" replace />;
}
