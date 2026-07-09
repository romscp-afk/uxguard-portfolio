import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

type ThemeToggleProps = {
  className?: string;
  /** compact = icon only for header */
  compact?: boolean;
};

export function ThemeToggle({ className = "", compact = true }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={
        className ||
        `inline-flex items-center justify-center rounded-lg border border-ink-200 bg-white p-2 text-ink-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-brand-500 dark:hover:text-brand-400 ${
          compact ? "h-10 w-10" : "gap-2 px-3 py-2 text-sm font-medium"
        }`
      }
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact ? <span>{isDark ? "Light" : "Dark"}</span> : null}
    </button>
  );
}
