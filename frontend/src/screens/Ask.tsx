import { useState } from 'react';
import { Button, Card, Notice, Page, PageHeading } from '../components/ui';
import { mockTenders } from '../data/mock';
import { daysUntil, formatDate } from '../lib/format';

// Answered from the tender data in the app; there is no assistant service yet.
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

export function Ask() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  const ask = (text: string) => {
    const known = QUESTIONS.find((item) => item.q === text);
    setAnswer(
      known ? known.answer() : 'Typed questions are not connected yet. Pick one of the questions above for an answer from your matches.',
    );
  };

  return (
    <Page className="max-w-3xl">
      <PageHeading title="Ask a question" subtitle="Get quick answers about your tenders." />
      <Card className="p-6">
        <h2 className="h2 mb-3">Common questions</h2>
        <div className="mb-5 flex flex-wrap gap-2">
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
      </Card>
    </Page>
  );
}
