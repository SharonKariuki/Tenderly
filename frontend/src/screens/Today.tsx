import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, StatusChip, ProgressBar, Page, SectionHeading, CountdownRing, Notice } from '../components/ui';
import { UploadButton } from '../components/UploadButton';
import { mockTenders, mockAlerts, mockDocuments, mockEvents } from '../data/mock';
import { useApp } from '../context/AppState';
import { categoryLabel } from '../config/agpo';
import { daysUntil, formatShortDate, formatTime } from '../lib/format';
import { Alert } from '../lib/types';
import {
  AlertCircle, Bell, Calendar, Check, ChevronRight, Clock, FileText, MapPin, Megaphone, Sparkles, Star, Upload,
} from 'lucide-react';

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

function ReadinessChart({ today }: { today: number }) {
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

function ProgressDonut({ value }: { value: number }) {
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

const alertIcon: Record<Alert['type'], ReactNode> = {
  newMatch: <Star size={18} aria-hidden />,
  expiringDoc: <Clock size={18} aria-hidden />,
  briefing: <Megaphone size={18} aria-hidden />,
  scamWarning: <AlertCircle size={18} aria-hidden />,
};

// Where each alert takes you when you open it.
const alertTarget: Record<Alert['type'], string> = {
  newMatch: '/tenders',
  expiringDoc: '/documents',
  briefing: '/tenders?open=4',
  scamWarning: '/check',
};

const tenderTile = ['bg-accent-50 text-accent-600', 'bg-ok-50 text-ok-700', 'bg-brand-50 text-brand-600'];

const STEPS = [
  'Register on the government tenders website',
  'Upload your company owners list',
  'Upload your tax clearance certificate',
  'Fill in and attach the bid forms',
  'Check everything and submit',
];

export function Today() {
  const navigate = useNavigate();
  const { profile } = useApp();
  const firstName = profile.ownerName.split(' ')[0];
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'ok' | 'warn' } | null>(null);
  const [alerts, setAlerts] = useState(mockAlerts);
  const [done, setDone] = useState<boolean[]>(STEPS.map((_, i) => i === 0));

  const topTender = mockTenders[0];
  const stationery = mockTenders.find((t) => t.id === 4)!;
  const eligibleCount = mockTenders.filter((t) => t.status === 'ready').length;
  const docsReady = mockDocuments.filter((d) => d.status === 'ready').length;
  const readyPercent = Math.round((docsReady / mockDocuments.length) * 100);
  const nextTender = [...mockTenders]
    .filter((t) => daysUntil(t.closingDate) >= 0)
    .sort((a, b) => a.closingDate.localeCompare(b.closingDate))[0];
  const daysLeft = Math.max(daysUntil(topTender.closingDate), 0);
  const unread = alerts.filter((a) => !a.isRead).length;
  const doneCount = done.filter(Boolean).length;
  const upcoming = mockEvents.filter((e) => daysUntil(e.startsAt) >= 0).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7;
  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="flex min-w-0 flex-1 flex-col xl:flex-row">
      <Page>
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="h1">Today</h1>
            <p className="mt-1 text-sm text-ink-soft">{dateLine}</p>
          </div>
          {nextTender && (
            <Link to={`/tenders?open=${nextTender.id}`} className="btn btn-accent self-start px-5 text-sm">
              <Calendar size={17} aria-hidden />
              Next deadline · {formatShortDate(nextTender.closingDate)}
            </Link>
          )}
        </div>

        {/* Greeting banner */}
        <Card hero className="relative mb-7 overflow-hidden p-6 sm:p-9">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 right-40 h-48 w-48 rounded-full bg-white/10" aria-hidden />

          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div className="max-w-xl">
              <h2 className="text-3xl font-light tracking-tight">
                <span className="font-semibold">Hello</span>, {firstName}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/95">
                Your documents are {readyPercent}% ready. {eligibleCount} tender fully matches your documents, and adding
                your company owners list opens up 4 more. Your top match closes in {daysLeft} days.
              </p>
              <div className="mt-6">
                <UploadButton
                  docType="cr12"
                  name="company owners list"
                  onMessage={(text, tone) => setMessage({ text, tone })}
                  className="btn bg-white px-5 text-sm text-brand-700 hover:bg-brand-50"
                >
                  <Upload size={17} aria-hidden />
                  Upload company owners list
                </UploadButton>
              </div>
            </div>

            <Link
              to={`/tenders?open=${topTender.id}`}
              className="relative hidden rounded-2xl md:block"
              aria-label={`Your top match: ${topTender.title}, ${topTender.matchScore}% match`}
            >
              <span className="absolute -left-8 -top-6 z-10 flex h-12 w-12 animate-floaty items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/40" aria-hidden>
                <Sparkles size={20} />
              </span>
              <span className="absolute -bottom-5 -right-4 z-10 flex h-12 w-12 animate-floaty items-center justify-center rounded-2xl bg-accent-500/90 shadow-accent [animation-delay:1.2s]" aria-hidden>
                <Check size={20} strokeWidth={3} />
              </span>
              <span className="block w-60 rounded-2xl bg-white/15 p-5 ring-1 ring-white/30 transition hover:bg-white/20">
                <span className="block text-xs font-medium text-white/85">Your top match</span>
                <span className="mt-1 block text-sm font-semibold leading-snug">{topTender.title}</span>
                <span className="mt-4 flex items-end justify-between">
                  <span className="text-4xl font-light">{topTender.matchScore}%</span>
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium">{topTender.value}</span>
                </span>
              </span>
            </Link>
          </div>
        </Card>

        {message && (
          <div className="mb-7">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        )}

        {/* Stats row */}
        <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-[1.7fr_1fr_0.9fr]">
          <Card className="p-5 md:col-span-2 xl:col-span-1">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="h2">How ready you are</h2>
              <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">This week</span>
            </div>
            <ReadinessChart today={todayIndex} />
          </Card>

          <Link to="/documents" className="card block p-5 transition hover:shadow-brand">
            <h2 className="h2 mb-4">Documents ready</h2>
            <ProgressDonut value={readyPercent} />
            <span className="mt-4 flex items-center justify-between text-xs text-ink-soft">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />
                Ready
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-500" aria-hidden />
                Still to do
              </span>
            </span>
          </Link>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-1">
            <Link to="/tenders?filter=eligible" className="card flex items-center gap-4 p-5 transition hover:shadow-brand">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                <FileText size={22} aria-hidden />
              </span>
              <span>
                <span className="block text-xs text-ink-soft">Tenders you qualify for</span>
                <span className="block text-2xl font-semibold text-brand-600">{eligibleCount}</span>
              </span>
            </Link>
            <Link to={`/tenders?open=${topTender.id}`} className="card flex items-center gap-4 p-5 transition hover:shadow-brand">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                <Clock size={22} aria-hidden />
              </span>
              <span>
                <span className="block text-xs text-ink-soft">Days to deadline</span>
                <span className="block text-2xl font-semibold text-brand-600">{daysLeft}</span>
              </span>
            </Link>
          </div>
        </div>

        {/* Top matches */}
        <SectionHeading title="Top matches">
          <Link to="/tenders" className="flex min-h-11 items-center px-2 text-sm font-medium text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </SectionHeading>
        <div className="mb-8 grid gap-5 md:grid-cols-3">
          {mockTenders.slice(0, 3).map((t, i) => (
            <Link key={t.id} to={`/tenders?open=${t.id}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-brand">
              <span className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tenderTile[i]}`}>
                  <FileText size={20} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-snug text-ink">{t.title}</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">{t.entity}</span>
                </span>
              </span>
              <span className="mt-5 flex items-center justify-between text-xs text-ink-soft">
                <span>Match</span>
                <span className="font-semibold text-ink">{t.matchScore}%</span>
              </span>
              <span className="mt-1.5 block">
                <ProgressBar value={t.matchScore} label={`${t.matchScore}% match`} />
              </span>
              <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                <StatusChip status={t.status} />
                <span className="whitespace-nowrap text-xs text-ink-soft">Closes {formatShortDate(t.closingDate)}</span>
              </span>
            </Link>
          ))}
        </div>

        {/* Coming up */}
        <SectionHeading title="Meetings and site visits" />
        {upcoming.length ? (
          <ul className="grid gap-4 md:grid-cols-3">
            {upcoming.map((e) => (
              <li key={e.id}>
                <Link to={`/tenders?open=${e.tenderId}`} className="card block h-full p-5 transition hover:shadow-brand">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {e.kind === 'briefing' ? 'Information meeting' : 'Site visit'} ·{' '}
                    {new Date(e.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, {formatTime(e.startsAt)}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-ink">{e.title}</span>
                  <span className="mt-1 flex items-start gap-1 text-xs text-ink-soft">
                    <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden /> {e.venue}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-5 text-sm text-ink-soft">No meetings or site visits coming up.</p>
        )}
      </Page>

      {/* Right rail */}
      <aside className="shrink-0 border-t border-line bg-white px-4 py-7 sm:px-8 xl:w-80 xl:border-l xl:border-t-0 xl:px-6 xl:py-9" aria-label="Your profile and alerts">
        <h2 className="h2">My profile</h2>
        <p className="mt-0.5 text-xs text-ink-soft">
          Documents <span className="font-semibold text-brand-600">{readyPercent}%</span> ready
        </p>

        <div className="mt-6 flex flex-col items-center text-center">
          <div className="relative h-32 w-32">
            <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="64" cy="64" r="60" fill="none" stroke="var(--color-brand-100)" strokeWidth="3" />
              <circle cx="64" cy="64" r="60" fill="none" stroke="var(--color-brand-600)" strokeWidth="3" strokeLinecap="round" strokeDasharray={377} strokeDashoffset={377 * (1 - readyPercent / 100)} />
            </svg>
            <span className="absolute -left-3 top-8 h-2.5 w-2.5 rounded-full bg-accent-500" aria-hidden />
            <span className="absolute -right-2 top-4 h-2 w-2 rounded-full bg-brand-400" aria-hidden />
            <span className="absolute -right-4 bottom-10 h-2.5 w-2.5 rounded-full bg-accent-500" aria-hidden />
            <span className="absolute bottom-1 left-2 h-2 w-2 rounded-full bg-brand-400" aria-hidden />
            <div className="absolute inset-3 flex items-center justify-center rounded-full bg-accent-500 text-3xl font-semibold text-white" aria-hidden>
              {profile.ownerName.split(' ').map((p) => p[0]).join('').slice(0, 2)}
            </div>
          </div>
          <p className="mt-4 font-semibold text-ink">{profile.ownerName}</p>
          <p className="text-xs text-ink-soft">{profile.businessName}</p>
          {profile.agpoCategory !== 'none' && (
            <span className="chip chip-ok mt-3">
              <Check size={13} strokeWidth={2.5} aria-hidden />
              {categoryLabel(profile.agpoCategory)}-owned business
            </span>
          )}
        </div>

        {/* Alerts */}
        <div className="mt-9">
          <SectionHeading title="Alerts">
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => setAlerts((list) => list.map((a) => ({ ...a, isRead: true })))}
                className="min-h-11 px-2 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Mark all read
              </button>
            ) : (
              <span className="flex items-center gap-1 text-xs text-ink-soft">
                <Bell size={13} aria-hidden />
                All caught up
              </span>
            )}
          </SectionHeading>
          <ul className="space-y-1">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => {
                    setAlerts((list) => list.map((a) => (a.id === alert.id ? { ...a, isRead: true } : a)));
                    navigate(alertTarget[alert.type]);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-brand-50"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      alert.type === 'scamWarning' ? 'bg-danger-50 text-danger-600' : 'bg-brand-100 text-brand-600'
                    }`}
                  >
                    {alertIcon[alert.type]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-ink">
                      {!alert.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden />}
                      <span>{alert.title}</span>
                      {!alert.isRead && <span className="sr-only">(unread)</span>}
                    </span>
                    <span className="block text-xs text-ink-soft">{alert.description}</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ink-soft" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Bid checklist */}
        <div className="mt-8 rounded-2xl bg-brand-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="h2">Stationery bid</h2>
              <p className="text-xs text-ink-soft">
                {doneCount} of {STEPS.length} steps done
              </p>
            </div>
            <CountdownRing daysRemaining={Math.max(daysUntil(stationery.closingDate), 0)} />
          </div>
          <div className="mt-3">
            <ProgressBar value={doneCount} max={STEPS.length} label="Steps done" />
          </div>
          <ul className="mt-4 space-y-1">
            {STEPS.map((step, i) => (
              <li key={step}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done[i]}
                  onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
                  className="flex w-full min-h-11 items-center gap-3 rounded-lg px-1 text-left text-sm hover:bg-white/60"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      done[i] ? 'bg-brand-600 text-white' : 'ring-2 ring-brand-200 ring-inset'
                    }`}
                    aria-hidden
                  >
                    {done[i] && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className={done[i] ? 'text-ink-soft line-through' : 'text-ink'}>{step}</span>
                </button>
              </li>
            ))}
          </ul>
          <Button variant="primary" size="sm" className="mt-5 w-full" onClick={() => navigate(`/tenders?open=${stationery.id}`)}>
            Continue bid
          </Button>
        </div>
      </aside>
    </div>
  );
}
