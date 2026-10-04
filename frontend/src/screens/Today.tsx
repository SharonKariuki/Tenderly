import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, StatusChip, ProgressBar, Page, SectionHeading, Notice } from '../components/ui';
import { ReadinessChart, ProgressDonut } from '../components/charts';
import { UploadButton } from '../components/UploadButton';
import { mockTenders, mockDocuments, mockEvents, BID_STEPS, BID_TENDER_ID } from '../data/mock';
import { useApp } from '../context/AppState';
import { daysUntil, formatShortDate, formatTime } from '../lib/format';
import { Bell, Calendar, CalendarDays, Check, ChevronRight, ClipboardCheck, Clock, FileText, Sparkles, Upload } from 'lucide-react';

const tenderTile = ['bg-accent-50 text-accent-600', 'bg-ok-50 text-ok-700', 'bg-brand-50 text-brand-600'];

function Shortcut({ to, icon, tile, title, detail }: { to: string; icon: ReactNode; tile: string; title: string; detail: string }) {
  return (
    <Link to={to} className="card flex items-center gap-4 p-5 transition hover:shadow-brand">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tile}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-ink-soft">{detail}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-ink-soft" aria-hidden />
    </Link>
  );
}

export function Today() {
  const { profile, alerts, bidSteps } = useApp();
  const firstName = profile.ownerName.split(' ')[0];
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'ok' | 'warn' } | null>(null);

  const topTender = mockTenders[0];
  const bidTender = mockTenders.find((t) => t.id === BID_TENDER_ID)!;
  const eligibleCount = mockTenders.filter((t) => t.status === 'ready').length;
  const docsReady = mockDocuments.filter((d) => d.status === 'ready').length;
  const readyPercent = Math.round((docsReady / mockDocuments.length) * 100);
  const nextTender = [...mockTenders]
    .filter((t) => daysUntil(t.closingDate) >= 0)
    .sort((a, b) => a.closingDate.localeCompare(b.closingDate))[0];
  const daysLeft = Math.max(daysUntil(topTender.closingDate), 0);
  const unread = alerts.filter((a) => !a.isRead);
  const stepsDone = bidSteps.filter(Boolean).length;
  const nextEvent = mockEvents
    .filter((e) => daysUntil(e.startsAt) >= 0)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7;
  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <Page>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="h1">Today</h1>
          <p className="mt-1 text-sm text-ink-soft">{dateLine}</p>
        </div>
        {nextTender && (
          <Link to={`/tenders/${nextTender.id}`} className="btn btn-accent self-start px-5 text-sm">
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
            to={`/tenders/${topTender.id}`}
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

      {/* Shortcuts to the other pages */}
      <div className="mb-8 grid gap-5 md:grid-cols-3">
        <Shortcut
          to="/alerts"
          icon={<Bell size={22} aria-hidden />}
          tile="bg-brand-100 text-brand-600"
          title="Alerts"
          detail={unread.length ? `${unread.length} new: ${unread[0].title}` : 'All caught up'}
        />
        <Shortcut
          to="/bids"
          icon={<ClipboardCheck size={22} aria-hidden />}
          tile="bg-accent-50 text-accent-600"
          title="My bids"
          detail={`${bidTender.title}: ${stepsDone} of ${BID_STEPS.length} steps done`}
        />
        <Shortcut
          to="/meetings"
          icon={<CalendarDays size={22} aria-hidden />}
          tile="bg-ok-50 text-ok-700"
          title="Meetings and visits"
          detail={
            nextEvent
              ? `Next: ${new Date(nextEvent.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${formatTime(nextEvent.startsAt)}`
              : 'Nothing coming up'
          }
        />
      </div>

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
          <Link to={`/tenders/${topTender.id}`} className="card flex items-center gap-4 p-5 transition hover:shadow-brand">
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
      <div className="grid gap-5 md:grid-cols-3">
        {mockTenders.slice(0, 3).map((t, i) => (
          <Link key={t.id} to={`/tenders/${t.id}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-brand">
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
    </Page>
  );
}
