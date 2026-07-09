import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { canEditPlatform } from "../../lib/roles";

export function ReadOnlyNotice() {
  const { user } = useAuth();
  if (!user || canEditPlatform(user)) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Eye className="mt-0.5 h-5 w-5 shrink-0" />
      <p>
        You&apos;re signed in as a <strong>Viewer</strong>. You can explore all sections in read-only
        mode. Choose <strong>Professional</strong> at registration to create and edit content.
      </p>
    </div>
  );
}

export function EditGuard({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();
  if (canEditPlatform(user)) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  return null;
}

export function EditLink({
  to,
  children,
  className = "btn-primary",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  const { user } = useAuth();
  if (!canEditPlatform(user)) return null;
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
