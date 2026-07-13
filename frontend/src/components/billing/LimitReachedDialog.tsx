import { Link } from "react-router-dom";

type Props = {
  open: boolean;
  title: string;
  message: string;
  resetDate?: string | null;
  usageLabel?: string;
  onClose: () => void;
};

export function LimitReachedDialog({ open, title, message, resetDate, usageLabel, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="limit-reached-title"
    >
      <div className="card w-full max-w-md p-6 shadow-xl">
        <h2 id="limit-reached-title" className="font-display text-xl font-bold text-ink-950">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{message}</p>
        {usageLabel ? <p className="mt-2 text-xs font-medium text-ink-500">{usageLabel}</p> : null}
        {resetDate ? (
          <p className="mt-1 text-xs text-ink-400">
            Resets on {new Date(resetDate).toLocaleDateString()}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/upgrade" className="btn-primary" onClick={onClose}>
            Upgrade
          </Link>
          <Link to="/pricing" className="btn-secondary" onClick={onClose}>
            View plans
          </Link>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
