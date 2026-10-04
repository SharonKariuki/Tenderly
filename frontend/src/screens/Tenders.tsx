import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button, StatusChip, MatchRing, Page, PageHeading, FilterTabs } from '../components/ui';
import { mockTenders, mockDocuments } from '../data/mock';
import { daysUntil, formatDate } from '../lib/format';
import { ChevronRight, MessageCircleQuestion } from 'lucide-react';

type Filter = 'all' | 'eligible' | 'closing';
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'eligible', label: 'You qualify' },
  { id: 'closing', label: 'Closing in 7 days' },
] as const;

export function Tenders() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = (FILTERS.some((f) => f.id === params.get('filter')) ? params.get('filter') : 'all') as Filter;
  const setFilter = (id: Filter) => setParams(id === 'all' ? {} : { filter: id }, { replace: true });

  // Older links opened a tender inside this list; each tender has its own page now.
  const legacyOpen = params.get('open');
  if (legacyOpen) return <Navigate to={`/tenders/${legacyOpen}`} replace />;

  const filteredTenders = mockTenders.filter((t) => {
    if (filter === 'eligible') return t.status === 'ready';
    if (filter === 'closing') return daysUntil(t.closingDate) <= 7;
    return true;
  });

  const docsToFix = mockDocuments.filter((d) => d.status === 'actionNeeded' || d.status === 'missing').length;
  const readyPercent = Math.round((mockDocuments.filter((d) => d.status === 'ready').length / mockDocuments.length) * 100);

  return (
    <Page>
      <PageHeading title="Tenders" subtitle="Ranked for your business, with the reasons why.">
        <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 self-start px-4 py-3 sm:self-auto">
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

      <Link to="/ask" className="card mb-6 flex items-center gap-4 bg-linear-to-br from-white to-accent-50 p-5 transition hover:shadow-brand">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
          <MessageCircleQuestion size={20} aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">Have a question about your matches?</span>
          <span className="block text-sm text-ink-soft">Ask which documents you need, what closes soon and more.</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-soft" aria-hidden />
      </Link>

      <div className="mb-5">
        <FilterTabs label="Filter tenders" options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <ol className="space-y-3">
        {filteredTenders.map((tender, index) => (
          <li key={tender.id}>
            <Link
              to={`/tenders/${tender.id}`}
              className={`card grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 p-4 transition hover:shadow-brand sm:grid-cols-[auto_1fr_auto_auto_auto] sm:p-5 ${
                tender.topPick ? 'ring-2 ring-brand-300' : ''
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold ${
                  index === 0 ? 'bg-brand-600 text-white shadow-brand' : 'bg-brand-50 text-brand-700'
                }`}
              >
                #{index + 1}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink sm:text-base">{tender.title}</span>
                  {tender.topPick && <span className="rounded-full bg-accent-500 px-2 py-0.5 text-xs font-semibold text-white">Top pick</span>}
                </span>
                <span className="block text-sm text-ink-soft">
                  {tender.entity} · closes {formatDate(tender.closingDate)}
                </span>
              </span>
              <ChevronRight size={20} className="text-ink-soft sm:order-last" aria-hidden />
              <span className="col-span-3 flex items-center gap-3 sm:col-span-1 sm:contents">
                <MatchRing score={tender.matchScore} />
                <StatusChip status={tender.status} />
              </span>
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
