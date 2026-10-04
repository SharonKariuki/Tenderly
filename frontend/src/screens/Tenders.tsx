import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, StatusChip, MatchRing } from '../components/ui';
import { mockTenders } from '../data/mock';
import { daysUntil, formatDate } from '../lib/format';
import { ChevronDown, Sparkles, Star } from 'lucide-react';

type Filter = 'all' | 'eligible' | 'closing';

// Answered from the tender data on this page; there is no assistant endpoint yet.
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
        : 'Nothing: you have every document your matches ask for.';
    },
  },
];

export function Tenders() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const filteredTenders = mockTenders.filter((t) => {
    if (filter === 'eligible') return t.status === 'ready';
    if (filter === 'closing') return daysUntil(t.closingDate) <= 7;
    return true;
  });

  const ask = (text: string) => {
    const known = QUESTIONS.find((item) => item.q === text);
    setAnswer(
      known
        ? known.answer()
        : 'Typed questions are not connected yet. Pick one of the suggested questions above for an answer from your matches.',
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8">
        <div>
          <h1 className="h1 mb-2">Tenders</h1>
          <p className="text-lg text-plum-soft">Ranked for your business, with the reasons why.</p>
        </div>
        <Card className="p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm font-semibold text-plum">67% ready</span>
          <span className="text-plum-muted text-sm">2 documents to fix</span>
          <Button variant="secondary" size="sm" onClick={() => navigate('/documents')}>
            Fix now
          </Button>
        </Card>
      </div>

      {/* Assistant */}
      <Card className="p-5 sm:p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-xl bg-plum flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-white" aria-hidden />
          </span>
          <h2 className="h2 text-plum">Ask about your matches</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {QUESTIONS.map(({ q }) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQuestion(q);
                ask(q);
              }}
              className="focus-ring min-h-[40px] rounded-pill border border-plum/20 bg-white px-4 py-2 text-left text-sm font-medium text-plum hover:border-plum"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex flex-col sm:flex-row gap-2"
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
            className="input flex-1 min-w-0"
          />
          <Button type="submit" variant="primary" disabled={!question.trim()}>
            Ask
          </Button>
        </form>
        {answer && (
          <p className="mt-4 rounded-tile bg-blush/60 p-4 text-sm text-plum-ink" role="status">
            {answer}
          </p>
        )}
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter tenders">
        {(
          [
            { id: 'all', label: 'All tenders' },
            { id: 'eligible', label: 'Eligible' },
            { id: 'closing', label: 'Closing in 7 days' },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`focus-ring min-h-[44px] rounded-pill px-5 text-sm font-medium transition-colors ${
              filter === f.id ? 'bg-plum text-white' : 'bg-white/70 text-plum border border-plum/15 hover:border-plum'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <ol className="space-y-3">
        {filteredTenders.map((tender, index) => {
          const open = openId === tender.id;
          return (
            <li
              key={tender.id}
              className={`card overflow-hidden ${tender.topPick ? 'border-2 border-coral/60' : ''} ${
                tender.status === 'notEligible' ? 'opacity-60' : ''
              }`}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`tender-${tender.id}`}
                onClick={() => setOpenId(open ? null : tender.id)}
                className="focus-ring w-full p-4 sm:p-5 text-left grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-4 gap-y-3"
              >
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-plum text-white' : 'bg-blush text-plum'
                  }`}
                >
                  #{index + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-plum-ink">{tender.title}</span>
                    {tender.topPick && (
                      <span className="inline-flex items-center gap-1 bg-plum text-white text-xs font-bold px-2.5 py-0.5 rounded-pill">
                        <Star size={12} aria-hidden /> Top pick
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-plum-muted">
                    {tender.entity} · Closes {formatDate(tender.closingDate)}
                  </span>
                </span>
                <ChevronDown
                  size={22}
                  className={`text-plum-muted transition-transform sm:order-last ${open ? 'rotate-180' : ''}`}
                  aria-hidden
                />
                <span className="col-span-3 sm:col-span-1 flex items-center gap-3 sm:contents">
                  <MatchRing score={tender.matchScore} />
                  <StatusChip status={tender.status} />
                </span>
              </button>
              {open && (
                <div id={`tender-${tender.id}`} className="border-t border-plum/10 px-4 sm:px-5 py-4 grid sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-plum-ink mb-1">What it is for</p>
                    <p className="text-plum-soft">{tender.purpose}</p>
                    <p className="mt-2 text-plum-muted">
                      {tender.reference} · {tender.value}
                      {tender.reservedFor && <> · Reserved for {tender.reservedFor}</>}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-plum-ink mb-1">Documents asked for</p>
                    <ul className="list-disc pl-5 text-plum-soft">
                      {tender.requiredDocs.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-plum-ink mb-1">You are missing</p>
                    {tender.missingDocs.length ? (
                      <ul className="list-disc pl-5 text-coral">
                        {tender.missingDocs.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-plum-soft">Nothing. You can bid.</p>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {!filteredTenders.length && (
        <p className="card p-8 text-center text-plum-muted">No tenders match this filter.</p>
      )}

      <p className="text-sm text-plum-muted text-center mt-6">
        Your match score combines sector fit, location, AGPO eligibility and document readiness.
      </p>
    </div>
  );
}
