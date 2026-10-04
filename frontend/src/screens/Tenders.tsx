import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button, StatusChip, Page, PageHeading, FilterTabs } from '../components/ui';
import { mockDocuments } from '../data/mock';
import { useApp } from '../context/AppState';
import { daysUntil, formatDate } from '../lib/format';
import { ChevronRight } from 'lucide-react';

type Filter = 'all' | 'eligible' | 'closing';
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'eligible', label: 'You qualify' },
  { id: 'closing', label: 'Closing in 7 days' },
] as const;

export function Tenders() {
  const navigate = useNavigate();
  const { watchedTenders } = useApp();
  const [params, setParams] = useSearchParams();
  const filter = (FILTERS.some((f) => f.id === params.get('filter')) ? params.get('filter') : 'all') as Filter;
  const setFilter = (id: Filter) => setParams(id === 'all' ? {} : { filter: id }, { replace: true });

  // Older links opened a tender inside this list; each tender has its own page now.
  const legacyOpen = params.get('open');
  if (legacyOpen) return <Navigate to={`/tenders/${legacyOpen}`} replace />;

  const filteredTenders = watchedTenders.filter((t) => {
    if (filter === 'eligible') return t.status === 'ready';
    if (filter === 'closing') return daysUntil(t.closingDate) <= 7;
    return true;
  });

  const docsToFix = mockDocuments.filter((d) => d.status === 'actionNeeded' || d.status === 'missing').length;
  const readyPercent = Math.round((mockDocuments.filter((d) => d.status === 'ready').length / mockDocuments.length) * 100);

  return (
    <Page>
      <PageHeading title="Tenders" subtitle="Ranked for your business, with the reasons why.">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 self-start sm:self-auto">
          <span className="flex items-center gap-2 text-sm font-semibold text-accent-700">
            <span className="h-2 w-2 rounded-full bg-accent-500" aria-hidden />
            Documents {readyPercent}% ready
          </span>
          <span className="text-sm text-ink-soft">
            {docsToFix} document{docsToFix === 1 ? '' : 's'} to fix
          </span>
          <Button variant="secondary" size="sm" onClick={() => navigate('/documents?filter=action')}>
            Fix now
          </Button>
        </div>
      </PageHeading>

      <p className="mb-6 text-sm text-ink-soft">
        Not sure what you need?{' '}
        <Link to="/ask" className="font-bold text-brand-600 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-600">
          Ask a question about your matches
        </Link>
      </p>

      <div className="mb-5">
        <FilterTabs label="Filter tenders" options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <ol className="divide-y divide-line border-y border-line">
        {filteredTenders.map((tender, index) => (
          <li key={tender.id}>
            <Link
              to={`/tenders/${tender.id}`}
              className="group grid grid-cols-[2rem_1fr_auto] items-center gap-x-4 gap-y-2 py-4 hover:bg-paper-deep sm:grid-cols-[2rem_1fr_auto_9rem_auto] sm:px-3"
            >
              <span className="font-display text-lg font-bold text-muted tabular-nums">{index + 1}</span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-ink">{tender.title}</span>
                  {tender.topPick && (
                    <span className="rounded bg-accent-50 px-1.5 py-0.5 text-xs font-bold text-accent-700 ring-1 ring-accent-100">Best match</span>
                  )}
                </span>
                <span className="block text-sm text-ink-soft">
                  {tender.entity} · closes {formatDate(tender.closingDate)}
                </span>
              </span>
              <span className="text-right sm:text-left">
                <span className="block font-display text-xl font-bold tabular-nums text-ink">{tender.matchScore}%</span>
                <span className="block text-xs text-muted">match</span>
              </span>
              <span className="col-start-2 sm:col-start-auto">
                <StatusChip status={tender.status} />
              </span>
              <ChevronRight size={18} className="hidden text-muted transition group-hover:translate-x-0.5 group-hover:text-ink sm:block" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
      {!filteredTenders.length && (
        <Card className="p-8 text-center">
          <p className="mb-4 text-ink-soft">No tenders match this filter.</p>
          <Button variant="outlined" onClick={() => setFilter('all')}>
            Show all tenders
          </Button>
        </Card>
      )}

      <p className="mt-6 text-center text-sm text-ink-soft">
        Your match score looks at your business type, location, the groups that own it and how ready your documents are.
      </p>
    </Page>
  );
}
