import { Link } from 'react-router-dom';
import { Card, CountdownRing, Page, PageHeading, ProgressBar } from '../components/ui';
import { useApp } from '../context/AppState';
import { mockTenders, BID_STEPS, BID_TENDER_ID } from '../data/mock';
import { daysUntil, formatDate } from '../lib/format';
import { Check } from 'lucide-react';

// Where each step is done in the app, when it is.
const STEP_LINKS: (string | null)[] = [null, '/documents/8', '/documents/2', null, null];

export function Bids() {
  const { bidSteps, toggleBidStep } = useApp();
  const tender = mockTenders.find((t) => t.id === BID_TENDER_ID)!;
  const done = bidSteps.filter(Boolean).length;

  return (
    <Page className="max-w-3xl">
      <PageHeading title="My bids" subtitle="Tick each step as you finish it." />

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="h2">{tender.title}</h2>
            <p className="text-sm text-ink-soft">
              {tender.entity} · closes {formatDate(tender.closingDate)}
            </p>
            <p className="mt-2 text-sm font-medium text-ink">
              {done} of {BID_STEPS.length} steps done
            </p>
          </div>
          <CountdownRing daysRemaining={Math.max(daysUntil(tender.closingDate), 0)} />
        </div>
        <div className="mt-4">
          <ProgressBar value={done} max={BID_STEPS.length} label="Steps done" />
        </div>

        <ul className="mt-5 space-y-1">
          {BID_STEPS.map((step, i) => (
            <li key={step} className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={bidSteps[i]}
                onClick={() => toggleBidStep(i)}
                className="flex min-h-11 flex-1 items-center gap-3 rounded-lg px-2 text-left text-sm hover:bg-brand-50"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    bidSteps[i] ? 'bg-brand-600 text-white' : 'ring-2 ring-brand-200 ring-inset'
                  }`}
                  aria-hidden
                >
                  {bidSteps[i] && <Check size={14} strokeWidth={3} />}
                </span>
                <span className={bidSteps[i] ? 'text-ink-soft line-through' : 'text-ink'}>{step}</span>
              </button>
              {STEP_LINKS[i] && !bidSteps[i] && (
                <Link to={STEP_LINKS[i]!} className="flex min-h-11 items-center px-3 text-sm font-medium text-brand-600 hover:text-brand-700">
                  Do it now
                </Link>
              )}
              {i === 0 && !bidSteps[i] && (
                <a
                  href="https://tenders.go.ke/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 items-center px-3 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Open the website
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`/tenders/${tender.id}`} className="btn btn-primary px-5 text-sm">
            See the tender
          </Link>
          <a href="https://tenders.go.ke/" target="_blank" rel="noreferrer" className="btn btn-outlined px-5 text-sm">
            Submit on the government website
          </a>
        </div>
      </Card>
    </Page>
  );
}
