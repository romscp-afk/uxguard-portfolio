type ScoreGaugeProps = {
  score: number;
  size?: "sm" | "lg";
  label?: string;
};

function scoreTone(score: number) {
  if (score >= 85) return { ring: "stroke-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" };
  if (score >= 70) return { ring: "stroke-brand-500", text: "text-brand-700", bg: "bg-brand-50" };
  if (score >= 55) return { ring: "stroke-amber-500", text: "text-amber-700", bg: "bg-amber-50" };
  return { ring: "stroke-red-500", text: "text-red-700", bg: "bg-red-50" };
}

export function ScoreGauge({ score, size = "lg", label = "Overall UX Score" }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone = scoreTone(clamped);
  const dim = size === "lg" ? 160 : 96;
  const stroke = size === "lg" ? 10 : 8;
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`flex flex-col items-center gap-2 ${tone.bg} rounded-2xl p-4`}>
      <div className="relative" style={{ width: dim, height: dim }} role="img" aria-label={`${label}: ${clamped} out of 100`}>
        <svg width={dim} height={dim} className="-rotate-90" aria-hidden>
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-ink-100"
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${tone.ring} transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display font-bold ${size === "lg" ? "text-4xl" : "text-2xl"} ${tone.text}`}>
            {clamped}
          </span>
          <span className="text-xs text-ink-500">/100</span>
        </div>
      </div>
      <p className="text-center text-sm font-medium text-ink-700">{label}</p>
    </div>
  );
}
