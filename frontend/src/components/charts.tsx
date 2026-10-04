// Charts used on Today.

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const readiness = [38, 44, 41, 52, 58, 66, 71];

// Smooth line through the points (Catmull-Rom converted to cubic Béziers)
function smoothPath(points: [number, number][]) {
  return points.reduce((d, p, i, a) => {
    if (i === 0) return `M${p[0]},${p[1]}`;
    const p0 = a[i - 2] ?? a[i - 1];
    const p1 = a[i - 1];
    const p3 = a[i + 1] ?? p;
    const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6];
    const c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6];
    return `${d} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p[0]},${p[1]}`;
  }, '');
}

export function ReadinessChart({ today }: { today: number }) {
  const w = 320;
  const h = 120;
  const step = w / days.length;
  const points = readiness.map((v, i) => [step * i + step / 2, h - (v / 100) * h] as [number, number]);

  return (
    <svg
      viewBox={`0 0 ${w} ${h + 34}`}
      className="h-auto w-full"
      role="img"
      aria-label={`How ready you are to bid this week: from ${readiness[0]}% on Monday to ${readiness[6]}% on Sunday`}
    >
      {points.map(([x], i) => (
        <rect key={i} x={x - 6} y={0} width={12} height={h} rx={6} fill={i === today ? 'var(--color-accent-100)' : 'var(--color-brand-50)'} />
      ))}
      <path d={smoothPath(points)} fill="none" stroke="var(--color-brand-600)" strokeWidth="4" strokeLinecap="round" />
      <circle cx={points[today][0]} cy={points[today][1]} r="6" fill="white" stroke="var(--color-accent-500)" strokeWidth="3" />
      {days.map((d, i) => (
        <text
          key={d}
          x={points[i][0]}
          y={h + 24}
          textAnchor="middle"
          fontSize="12"
          fontWeight={i === today ? 600 : 400}
          fill={i === today ? 'var(--color-accent-700)' : 'var(--color-ink-soft)'}
        >
          {d}
        </text>
      ))}
    </svg>
  );
}

export function ProgressDonut({ value }: { value: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-32 w-32" role="img" aria-label={`${value}% of your documents are ready`}>
      <svg viewBox="0 0 120 120" className="-rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-accent-500)" strokeWidth="12" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-brand-500)" strokeWidth="12" strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} />
      </svg>
      <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white text-xl font-semibold text-ink shadow-card">
        {value}%
      </div>
    </div>
  );
}
