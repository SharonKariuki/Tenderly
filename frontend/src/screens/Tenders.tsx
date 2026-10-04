import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button, StatusChip, MatchRing, Page, PageHeading, FilterTabs, Notice } from '../components/ui';
import { mockTenders, mockDocuments } from '../data/mock';
import { daysUntil, formatDate } from '../lib/format';
import { ChevronDown, Sparkles } from 'lucide-react';

type Filter = 'all' | 'eligible' | 'closing';
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'eligible', label: 'You qualify' },
  { id: 'closing', label: 'Closing in 7 days' },
] as const;

// Answered from the tender data on this page; there is no assistant service yet.
const QUESTIONS: { q: string; answer: () => string }[] = [
  {
    q: 'What documents do I need for my top match?',
    answer: () => `${mockTenders[0].title} asks for: ${mockTenders[0].requiredDocs.join(', ')}.`,
  },
  {
    q: 'Which tenders close in the next 7 days?',
    answer: () => {
      const soon = mockTenders.filter((t) => daysUntil(t.closingDate) <= 7 && daysUntil(t.closingDate) >= 0);
      return soon.length
        ? soon.map((t) => `${t.title} (closes ${formatDate(t.closingDate)})`).join('; ')
        : 'None of your matches close in the next 7 days.';
    },
  },
  {
    q: 'What am I missing to bid?',
    answer: () => {
      const gaps = mockTenders.filter((t) => t.missingDocs.length);
      return gaps.length
        ? gaps.map((t) => `${t.title}: ${t.missingDocs.join(', ')}`).join('; ')
        : 'Nothing. You have every document your matches ask for.';
    },
  },
];

export function Tenders() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = (FILTERS.some((f) => f.id === params.get('filter')) ? params.get('filter') : 'all') as Filter;
  const openId = Number(params.get('open')) || null;
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  const setFilter = (id: Filter) => setParams(id === 'all' ? {} : { filter: id }, { replace: true });
  const toggleOpen = (id: number) => {
    const next = new URLSearchParams(params);
    if (openId === id) next.delete('open');
    else next.set('open', String(id));
    setParams(next, { replace: true });
  };

  // A link to a tender (from Today or the Map) scrolls it into view.
  useEffect(() => {
    if (openId) document.getElementById(`tender-row-${openId}`)?.scrollIntoView({ block: 'center' });
  }, [openId]);

  const filteredTenders = mockTenders.filter((t) => {
    if (filter === 'eligible') return t.status === 'ready';
    if (filter === 'closing') return daysUntil(t.closingDate) <= 7;
    return true;
  });

  const docsToFix = mockDocuments.filter((d) => d.status === 'actionNeeded' || d.status === 'missing').length;
  const readyPercent = Math.round((mockDocuments.filter((d) => d.status === 'ready').length / mockDocuments.length) * 100);

  const ask = (text: string) => {
    const known = QUESTIONS.find((item) => item.q === text);
    setAnswer(
      known
        ? known.answer()
        : 'Typed questions are not connected yet. Pick one of the questions above for an answer from your matches.',
    );
  };

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

      {/* Assistant */}
      <Card className="mb-8 bg-linear-to-br from-white to-accent-50 p-5 sm:p-6">
        <div className="flex gap-4">
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand sm:flex">
            <Sparkles size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="h2 mb-3">Ask about your matches</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {QUESTIONS.map(({ q }) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuestion(q);
                    ask(q);
                  }}
                  className="min-h-10 rounded-full bg-brand-50 px-4 text-left text-sm font-medium text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (question.trim()) ask(question.trim());
              }}
            >
              <label htmlFor="tender-question" className="sr-only">
                Your question
              </label>
              <input
                id="tender-question"
                type="text"
                placeholder="Or type your question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="input min-w-0 flex-1"
              />
              <Button type="submit" variant="primary" disabled={!question.trim()}>
                Ask
              </Button>
            </form>
            {answer && (
              <div className="mt-4">
                <Notice>{answer}</Notice>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="mb-5">
        <FilterTabs label="Filter tenders" options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <ol className="space-y-3">
        {filteredTenders.map((tender, index) => {
          const open = openId === tender.id;
          return (
            <li
              key={tender.id}
              id={`tender-row-${tender.id}`}
              className={`card overflow-hidden transition ${tender.topPick ? 'ring-2 ring-brand-300' : ''} ${open ? 'shadow-brand' : ''}`}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`tender-${tender.id}`}
                onClick={() => toggleOpen(tender.id)}
                className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 p-4 text-left sm:grid-cols-[auto_1fr_auto_auto_auto] sm:p-5"
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
                    {tender.topPick && (
                      <span className="rounded-full bg-accent-500 px-2 py-0.5 text-xs font-semibold text-white">Top pick</span>
                    )}
                  </span>
                  <span className="block text-sm text-ink-soft">
                    {tender.entity} · closes {formatDate(tender.closingDate)}
                  </span>
                </span>
                <ChevronDown size={20} className={`text-ink-soft transition-transform sm:order-last ${open ? 'rotate-180' : ''}`} aria-hidden />
                <span className="col-span-3 flex items-center gap-3 sm:col-span-1 sm:contents">
                  <MatchRing score={tender.matchScore} />
                  <StatusChip status={tender.status} />
                </span>
              </button>
              {open && (
                <div id={`tender-${tender.id}`} className="grid gap-5 border-t border-line px-4 py-5 text-sm sm:grid-cols-3 sm:px-5">
                  <div>
                    <p className="mb-1 font-semibold text-ink">What it is for</p>
                    <p className="text-ink-soft">{tender.purpose}</p>
                    <p className="mt-2 text-ink-soft">
                      Worth {tender.value}
                      {tender.reservedFor && <> · For {tender.reservedFor.toLowerCase()}</>}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">Reference {tender.reference}</p>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-ink">Documents they ask for</p>
                    <ul className="list-disc pl-5 text-ink-soft">
                      {tender.requiredDocs.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-ink">You are missing</p>
                    {tender.missingDocs.length ? (
                      <>
                        <ul className="mb-3 list-disc pl-5 text-danger-600">
                          {tender.missingDocs.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                        <Button variant="accent" size="sm" onClick={() => navigate('/documents?filter=action')}>
                          Add missing documents
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="mb-3 text-ink-soft">Nothing. You can bid.</p>
                        <a href="https://tenders.go.ke/" target="_blank" rel="noreferrer" className="btn btn-primary px-4 text-sm">
                          Bid on the government website
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
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
