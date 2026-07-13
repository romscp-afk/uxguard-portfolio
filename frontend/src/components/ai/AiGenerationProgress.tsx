import { useEffect, useState } from "react";

const STEPS = [
  "Reviewing your information",
  "Structuring the content",
  "Generating recommendations",
  "Preparing your result",
];

export function AiGenerationProgress({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="card border-brand-100 bg-brand-50/40 p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-sm font-semibold text-ink-900">Generating with UXGuard AI</p>
      <p className="mt-1 text-sm text-ink-600">{STEPS[step]}…</p>
      <ol className="mt-4 space-y-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`flex items-center gap-2 text-xs ${
              index === step ? "font-semibold text-brand-700" : "text-ink-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                index === step ? "bg-brand-600" : index < step ? "bg-brand-300" : "bg-ink-200"
              }`}
            />
            {label}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[11px] text-ink-400">
        Progress labels describe the interface experience, not exact internal model steps.
      </p>
    </div>
  );
}
