import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, StatusChip, ProgressBar, Page, SectionHeading, Notice } from '../components/ui';
import { ReadinessChart } from '../components/charts';
import { UploadButton } from '../components/UploadButton';
import { mockDocuments, mockEvents, BID_STEPS, BID_TENDER_ID } from '../data/mock';
import { useApp } from '../context/AppState';
import { daysUntil, formatShortDate, formatTime } from '../lib/format';
import { ArrowRight, ChevronRight, Upload } from 'lucide-react';

// One line of the "at a glance" list.
function GlanceRow({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <li>
      <Link to={to} className="group grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3 hover:bg-paper-deep sm:px-3">
        <span className="min-w-0 sm:grid sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-4">
          <span className="block text-sm font-bold text-ink">{label}</span>
          <span className="block min-w-0 text-sm text-ink-soft">{children}</span>
        </span>
        <ChevronRight size={18} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
      </Link>
    </li>
  );
}

export function Today() {
  const { profile, alerts, bidSteps, watchedTenders: tenders } = useApp();
  const firstName = profile.ownerName.split(' ')[0];
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'ok' | 'warn' } | null>(null);

  const topTender = tenders[0];
  const bidTender = tenders.find((t) => t.id === BID_TENDER_ID)!;
  const eligibleCount = tenders.filter((t) => t.status === 'ready').length;
  const docsReady = mockDocuments.filter((d) => d.status === 'ready').length;
  const readyPercent = Math.round((docsReady / mockDocuments.length) * 100);
  const nextTender = [...tenders]
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
  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Page>
      {/* Greeting */}
      <div className="mb-8 flex flex-col gap-5 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.08em] text-muted">{dateLine}</p>
          <h1 className="h1">Hello, {firstName}.</h1>
          <p className="mt-3 text-lg text-ink-soft">
            Your documents are <strong className="text-ink">{readyPercent}% ready</strong>. Add your company owners list and
            4 more tenders open up to you.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <UploadButton
              docType="cr12"
              name="company owners list"
              onMessage={(text, tone) => setMessage({ text, tone })}
              className="btn btn-primary px-5 text-sm"
            >
              <Upload size={17} aria-hidden />
              Upload company owners list
            </UploadButton>
            <Link to="/documents" className="btn btn-outlined px-5 text-sm">
              See all documents
            </Link>
          </div>
        </div>
        {nextTender && (
          <Link
            to={`/tenders/${nextTender.id}`}
            className="flex items-baseline gap-3 self-start rounded-lg border border-accent-100 bg-accent-50 px-4 py-3 text-accent-700 hover:border-accent-500 md:self-auto"
          >
            <span className="font-display text-3xl font-bold tabular-nums">{Math.max(daysUntil(nextTender.closingDate), 0)}</span>
            <span className="text-sm font-bold leading-tight">
              days to the next deadline
              <span className="block font-normal">{formatShortDate(nextTender.closingDate)}</span>
            </span>
          </Link>
        )}
      </div>

      {message && (
        <div className="mb-6">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}

      {/* Top match: the one strong block on the page */}
      <Link
        to={`/tenders/${topTender.id}`}
        className="card-hero group mb-10 grid gap-6 p-6 sm:p-7 md:grid-cols-[1fr_auto] md:items-center"
      >
        <span>
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-white/75">Your best match</span>
          <span className="mt-2 block font-display text-2xl font-bold leading-tight sm:text-3xl">{topTender.title}</span>
          <span className="mt-2 block text-sm text-white/85">
            {topTender.entity} · {topTender.value} · for {topTender.reservedFor.toLowerCase()}
          </span>
        </span>
        <span className="flex items-center gap-6">
          <span>
            <span className="block font-display text-5xl font-bold tabular-nums leading-none">{topTender.matchScore}%</span>
            <span className="text-sm text-white/80">match</span>
          </span>
          <span className="border-l border-white/25 pl-6">
            <span className="block font-display text-5xl font-bold tabular-nums leading-none">{daysLeft}</span>
            <span className="text-sm text-white/80">days left</span>
          </span>
          <ArrowRight size={24} className="hidden transition group-hover:translate-x-1 sm:block" aria-hidden />
        </span>
      </Link>

      <div className="mb-10 grid gap-10 lg:grid-cols-[1.15fr_1fr]">
        {/* At a glance */}
        <section aria-labelledby="glance">
          <h2 id="glance" className="h2 mb-2">
            At a glance
          </h2>
          <ul className="divide-y divide-line border-y border-line">
            <GlanceRow to="/alerts" label="Alerts">
              {unread.length ? (
                <>
                  <strong className="text-accent-700">{unread.length} new</strong> · {unread[0].title}
                </>
              ) : (
                'All caught up'
              )}
            </GlanceRow>
            <GlanceRow to="/bids" label="My bids">
              {bidTender.title}: {stepsDone} of {BID_STEPS.length} steps done
            </GlanceRow>
            <GlanceRow to="/meetings" label="Meetings">
              {nextEvent
                ? `${nextEvent.kind === 'briefing' ? 'Information meeting' : 'Site visit'}, ${new Date(nextEvent.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${formatTime(nextEvent.startsAt)}`
                : 'Nothing coming up'}
            </GlanceRow>
            <GlanceRow to="/documents" label="Documents">
              <span className="flex items-center gap-3">
                <span className="w-24 shrink-0">
                  <ProgressBar value={docsReady} max={mockDocuments.length} label="Documents ready" />
                </span>
                {docsReady} of {mockDocuments.length} ready
              </span>
            </GlanceRow>
            <GlanceRow to="/tenders?filter=eligible" label="You qualify for">
              {eligibleCount} tender{eligibleCount === 1 ? '' : 's'} right now
            </GlanceRow>
          </ul>
        </section>

        {/* Readiness this week */}
        <section aria-labelledby="readiness">
          <h2 id="readiness" className="h2 mb-2">
            How ready you are this week
          </h2>
          <Card className="p-5">
            <ReadinessChart today={todayIndex} />
          </Card>
        </section>
      </div>

      {/* Top matches */}
      <SectionHeading title="Your matches">
        <Link to="/tenders" className="flex min-h-11 items-center gap-1 px-2 text-sm font-bold text-brand-600 hover:text-brand-700">
          All tenders <ArrowRight size={16} aria-hidden />
        </Link>
      </SectionHeading>
      <ol className="divide-y divide-line border-y border-line">
        {tenders.slice(0, 4).map((t, i) => (
          <li key={t.id}>
            <Link
              to={`/tenders/${t.id}`}
              className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-4 gap-y-2 py-4 hover:bg-paper-deep sm:grid-cols-[2rem_1fr_5rem_9rem_6rem] sm:px-3"
            >
              <span className="font-display text-lg font-bold text-muted tabular-nums">{i + 1}</span>
              <span className="min-w-0">
                <span className="block font-bold text-ink">{t.title}</span>
                <span className="block text-sm text-ink-soft">{t.entity}</span>
              </span>
              <span className="text-right font-display text-xl font-bold tabular-nums text-ink sm:text-left">{t.matchScore}%</span>
              <span className="col-start-2 sm:col-start-auto">
                <StatusChip status={t.status} />
              </span>
              <span className="col-start-2 text-sm text-ink-soft sm:col-start-auto sm:text-right">
                Closes {formatShortDate(t.closingDate)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Page>
  );
}
