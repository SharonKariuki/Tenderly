import { Link, useParams } from 'react-router-dom';
import { BackLink, Card, CountdownRing, MatchRing, NotFound, Page, StatusChip } from '../components/ui';
import { mockDocuments, mockEvents, mockTenders } from '../data/mock';
import { daysUntil, formatDate, formatTime } from '../lib/format';
import { CalendarDays, CheckCircle, XCircle } from 'lucide-react';

export function TenderDetail() {
  const { id } = useParams();
  const tender = mockTenders.find((t) => t.id === Number(id));
  if (!tender) return <NotFound what="tender" back="/tenders" backLabel="Back to tenders" />;

  const events = mockEvents.filter((e) => e.tenderId === tender.id);
  const docFor = (name: string) => mockDocuments.find((d) => d.name.toLowerCase() === name.toLowerCase());

  return (
    <Page className="max-w-4xl">
      <BackLink to="/tenders">Back to tenders</BackLink>

      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusChip status={tender.status} />
              {tender.topPick && <span className="rounded-full bg-accent-500 px-2 py-0.5 text-xs font-semibold text-white">Top pick</span>}
            </div>
            <h1 className="h1">{tender.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">{tender.entity}</p>
            <p className="mt-1 text-xs text-ink-soft">Reference {tender.reference}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <MatchRing score={tender.matchScore} />
            <CountdownRing daysRemaining={Math.max(daysUntil(tender.closingDate), 0)} />
          </div>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Worth', tender.value],
            ['Closes', `${formatDate(tender.closingDate)}, ${formatTime(tender.closingDate)}`],
            ['Who can apply', tender.reservedFor],
          ].map(([label, value]) => (
            <div key={label} className="rounded-tile bg-canvas p-3">
              <dt className="text-xs text-ink-soft">{label}</dt>
              <dd className="text-sm font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="h2 mb-2">What it is for</h2>
          <p className="text-sm text-ink-soft">{tender.purpose}</p>
        </Card>
        <Card className="p-6">
          <h2 className="h2 mb-3">Documents they ask for</h2>
          <ul className="space-y-1">
            {tender.requiredDocs.map((name) => {
              const missing = tender.missingDocs.includes(name);
              const doc = docFor(name);
              return (
                <li key={name} className="flex min-h-11 items-center gap-3 text-sm">
                  {missing ? (
                    <XCircle size={18} className="shrink-0 text-danger-600" aria-label="Missing" />
                  ) : (
                    <CheckCircle size={18} className="shrink-0 text-ok-500" aria-label="You have it" />
                  )}
                  <span className="flex-1 text-ink">{name}</span>
                  {doc && (
                    <Link to={`/documents/${doc.id}`} className="flex min-h-11 items-center px-2 font-medium text-brand-600 hover:text-brand-700">
                      {missing ? 'Add it' : 'View'}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {events.length > 0 && (
        <Card className="mb-6 p-6">
          <h2 className="h2 mb-3">Meetings and visits</h2>
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-3 text-sm">
                <CalendarDays size={18} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
                <span>
                  <span className="font-semibold text-ink">{e.kind === 'briefing' ? 'Information meeting' : 'Site visit'}</span>
                  <span className="text-ink-soft">
                    {' '}
                    · {new Date(e.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })},{' '}
                    {formatTime(e.startsAt)} · {e.venue}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <Link to="/meetings" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-brand-600 hover:text-brand-700">
            See all meetings and visits
          </Link>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        {tender.missingDocs.length ? (
          <Link to="/documents?filter=action" className="btn btn-accent px-5 text-sm">
            Add missing documents
          </Link>
        ) : (
          <a href="https://tenders.go.ke/" target="_blank" rel="noreferrer" className="btn btn-primary px-5 text-sm">
            Bid on the government website
          </a>
        )}
        <Link to="/check" className="btn btn-outlined px-5 text-sm">
          Check it is real
        </Link>
      </div>
    </Page>
  );
}
