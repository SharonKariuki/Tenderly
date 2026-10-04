import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, MatchRing, CountdownRing } from '../components/ui';
import { mockTenders, mockAlerts, mockEvents, mockDocuments } from '../data/mock';
import { useApp } from '../context/AppState';
import { addDays, daysUntil, formatShortDate, formatTime, sameDay, weekStart } from '../lib/format';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Clock, Megaphone, MapPin, Star } from 'lucide-react';

const ALERT_ICONS = {
  scamWarning: <AlertCircle size={18} className="text-coral" aria-hidden />,
  newMatch: <Star size={18} className="text-warn-solid" aria-hidden />,
  expiringDoc: <Clock size={18} className="text-warn-solid" aria-hidden />,
  briefing: <Megaphone size={18} className="text-plum" aria-hidden />,
};

const STEPS = ['Register on portal', 'Upload CR12', 'Upload tax compliance', 'Submit bid documents', 'Review and submit'];

export function Today() {
  const navigate = useNavigate();
  const { profile } = useApp();
  const firstName = profile.ownerName.split(' ')[0];

  const topTender = mockTenders[0];
  const eligibleCount = mockTenders.filter((t) => t.status === 'ready').length;
  const docsReady = mockDocuments.filter((d) => d.status === 'ready').length;
  const readiness = Math.round((docsReady / mockDocuments.length) * 100);
  const daysLeft = Math.max(daysUntil(topTender.closingDate), 0);

  const [alerts, setAlerts] = useState(mockAlerts.slice(0, 4));
  const unread = alerts.filter((a) => !a.isRead).length;

  const [weekOffset, setWeekOffset] = useState(0);
  const monday = addDays(weekStart(), weekOffset * 7);
  const days = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  const weekEvents = mockEvents
    .filter((e) => days.some((d) => sameDay(d, new Date(e.startsAt))))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const [done, setDone] = useState<boolean[]>(STEPS.map((_, i) => i === 0));
  const doneCount = done.filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-12">
      {/* Greeting */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8">
        <div>
          <h1 className="h1 mb-2">Welcome back, {firstName}</h1>
          <p className="text-lg text-plum-soft">Here is where your bids stand today.</p>
        </div>
        <dl className="grid grid-cols-3 gap-4 sm:gap-8 w-full lg:w-auto text-center">
          <div className="flex flex-col-reverse">
            <dt className="text-sm text-plum-muted">tenders you qualify for</dt>
            <dd className="text-4xl font-light text-plum tabular-nums">{eligibleCount}</dd>
          </div>
          <div className="flex flex-col-reverse">
            <dt className="text-sm text-plum-muted">documents ready</dt>
            <dd className="text-4xl font-light text-plum tabular-nums">{readiness}%</dd>
          </div>
          <div className="flex flex-col-reverse">
            <dt className="text-sm text-plum-muted">days to next deadline</dt>
            <dd className="text-4xl font-light text-coral tabular-nums">{daysLeft}</dd>
          </div>
        </dl>
      </div>

      {/* Next step */}
      <Card hero className="mb-8 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 relative z-10">
          <span className="w-3 h-3 rounded-full bg-coral flex-shrink-0" aria-hidden />
          <div>
            <p className="font-semibold text-lg">Next step: upload your CR12</p>
            <p className="text-sm text-white/85">It unlocks 4 more matching tenders.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => navigate('/documents')} className="relative z-10 flex-shrink-0">
          Upload CR12
        </Button>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Top match */}
        <Card hero className="p-6 flex flex-col">
          <div className="relative z-10 flex flex-1 flex-col">
            <span className="self-start bg-white/20 rounded-pill px-3 py-1 text-xs font-bold mb-4">Your top match</span>
            <h2 className="text-2xl sm:text-3xl font-medium leading-tight mb-2">{topTender.title}</h2>
            <p className="text-sm text-white/85 mb-6">
              {topTender.entity} · {topTender.reference}
            </p>

            <div className="flex flex-wrap items-center gap-6 mb-6">
              <div className="flex items-center gap-3">
                <MatchRing score={topTender.matchScore} size="lg" tone="dark" />
                <p className="text-sm text-white/85 max-w-[7rem]">match with your business</p>
              </div>
              <CountdownRing daysRemaining={daysLeft} tone="dark" />
            </div>

            <dl className="grid grid-cols-2 gap-3 mb-5">
              {[
                ['Estimated value', topTender.value],
                ['Closes', formatShortDate(topTender.closingDate)],
                ['Reserved for', topTender.reservedFor],
                ['Your bid', `${topTender.bidProgress}% done`],
              ].map(([label, value]) => (
                <div key={label} className="bg-white/15 rounded-tile p-3">
                  <dt className="text-xs text-white/80">{label}</dt>
                  <dd className="font-semibold text-sm">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 flex-wrap">
                <span className="bg-white/15 rounded-pill px-3 py-1 text-xs">Sector match</span>
                <span className="bg-white/15 rounded-pill px-3 py-1 text-xs">Location eligible</span>
              </div>
              <Button variant="secondary" onClick={() => navigate('/tenders')}>
                View tender
              </Button>
            </div>
          </div>
        </Card>

        {/* Alerts */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-baseline justify-between gap-3 mb-5">
            <h2 className="h2">Recent alerts</h2>
            <span className="text-sm text-plum-muted">{unread ? `${unread} unread` : 'All read'}</span>
          </div>
          <ul className="space-y-2 mb-6">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={`p-4 rounded-tile flex gap-3 ${alert.isRead ? '' : 'bg-coral/10'}`}
              >
                <span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  {ALERT_ICONS[alert.type as keyof typeof ALERT_ICONS]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${alert.isRead ? 'text-plum-soft' : 'text-plum-ink'}`}>
                    {alert.title}
                    {!alert.isRead && <span className="sr-only"> (unread)</span>}
                  </p>
                  <p className="text-sm text-plum-muted">{alert.description}</p>
                </div>
                {!alert.isRead && <span className="w-2 h-2 rounded-full bg-coral flex-shrink-0 mt-2" aria-hidden />}
              </li>
            ))}
          </ul>
          <Button
            variant="outlined"
            className="w-full mt-auto"
            disabled={!unread}
            onClick={() => setAlerts((list) => list.map((a) => ({ ...a, isRead: true })))}
          >
            {unread ? 'Mark all read' : 'Nothing new'}
          </Button>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Week */}
        <Card className="p-6">
          <div className="flex justify-between items-center gap-3 mb-5">
            <div>
              <h2 className="h2">{weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Next week' : 'Week of'}</h2>
              <p className="text-sm text-plum-muted">
                {formatShortDate(days[0])} to {formatShortDate(days[5])}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outlined" size="sm" aria-label="Previous week" onClick={() => setWeekOffset((w) => w - 1)}>
                <ChevronLeft size={18} aria-hidden />
              </Button>
              <Button variant="outlined" size="sm" aria-label="Next week" onClick={() => setWeekOffset((w) => w + 1)}>
                <ChevronRight size={18} aria-hidden />
              </Button>
            </div>
          </div>
          <ol className="grid grid-cols-6 gap-1 mb-5" aria-label="Days">
            {days.map((d) => {
              const busy = weekEvents.some((e) => sameDay(d, new Date(e.startsAt)));
              const today = sameDay(d, new Date());
              return (
                <li
                  key={d.toISOString()}
                  className={`rounded-tile py-2 text-center ${today ? 'bg-plum text-white' : 'text-plum-ink'}`}
                >
                  <span className={`block text-xs ${today ? 'text-white/80' : 'text-plum-muted'}`}>
                    {d.toLocaleDateString('en-KE', { weekday: 'short' })}
                  </span>
                  <span className="block font-semibold tabular-nums">{d.getDate()}</span>
                  <span
                    className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${busy ? 'bg-coral' : 'bg-transparent'}`}
                    aria-label={busy ? 'has events' : undefined}
                  />
                </li>
              );
            })}
          </ol>
          {weekEvents.length ? (
            <ul className="space-y-3">
              {weekEvents.map((e) => (
                <li key={e.id} className="rounded-tile bg-blush/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-plum-soft">
                    {e.kind === 'briefing' ? 'Briefing' : 'Site visit'} ·{' '}
                    {new Date(e.startsAt).toLocaleDateString('en-KE', { weekday: 'short' })} {formatTime(e.startsAt)}
                  </p>
                  <p className="font-semibold text-plum-ink">{e.title}</p>
                  <p className="flex items-center gap-1 text-sm text-plum-muted">
                    <MapPin size={14} aria-hidden /> {e.venue}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-tile bg-blush/40 p-4 text-sm text-plum-muted">No briefings or site visits this week.</p>
          )}
        </Card>

        {/* Checklist */}
        <Card hero className="p-6">
          <div className="relative z-10">
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <h2 className="h2 text-white">Stationery bid</h2>
                <p className="text-sm text-white/85 mt-1">
                  {doneCount} of {STEPS.length} steps done
                </p>
              </div>
              <p className="text-4xl font-light tabular-nums">{Math.round((doneCount / STEPS.length) * 100)}%</p>
            </div>
            <ul className="space-y-1">
              {STEPS.map((step, i) => (
                <li key={step}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done[i]}
                    onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
                    className="focus-ring flex w-full min-h-[44px] items-center gap-3 rounded-tile px-2 text-left hover:bg-white/10"
                  >
                    <span
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        done[i] ? 'bg-white border-white text-plum' : 'border-white/60'
                      }`}
                      aria-hidden
                    >
                      {done[i] && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className={`text-sm ${done[i] ? 'text-white/70 line-through' : ''}`}>{step}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
