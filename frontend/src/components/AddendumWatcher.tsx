import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, FileUp, Loader2, Radar } from 'lucide-react';
import { Button, Card } from './ui';
import { useApp } from '../context/AppState';
import { mockAddenda } from '../data/mock';
import { CHANGE_LABEL } from '../lib/addenda';
import { formatShortDate } from '../lib/format';
import type { CheckState } from '../lib/types';

// What the backend does with an addendum (tenders/versions), shown as it happens.
const STEPS = ['Reading the addendum', 'Comparing it with version 1', 'Checking your documents against the new closing date'];
const STEP_MS = 900;

const STATE_CHIP: Record<CheckState, { className: string; label: string }> = {
  met: { className: 'chip chip-ok', label: 'Valid' },
  expiring: { className: 'chip chip-warn', label: 'Expires before closing' },
  missing: { className: 'chip chip-missing', label: 'Missing' },
  new: { className: 'chip chip-not-eligible', label: 'Not asked for before' },
};

function StateChip({ state }: { state: CheckState }) {
  const { className, label } = STATE_CHIP[state];
  return <span className={className}>{label}</span>;
}

/** The Addendum Watcher for one tender. Mocked: the addendum comes from mockAddenda. */
export function AddendumWatcher({ tenderId }: { tenderId: number }) {
  const { appliedAddenda, applyAddendum, resetAddendum } = useApp();
  const addendum = mockAddenda[tenderId];
  const applied = appliedAddenda.includes(tenderId);
  const [step, setStep] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Steps through STEPS, then applies the addendum and raises the alert.
  const start = (name: string) => {
    setFileName(name);
    setStep(0);
    timers.current = STEPS.map((_, i) =>
      window.setTimeout(() => {
        if (i < STEPS.length - 1) {
          setStep(i + 1);
        } else {
          setStep(null);
          applyAddendum(tenderId);
        }
      }, STEP_MS * (i + 1)),
    );
  };

  return (
    <Card className="mb-6 p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="h2 flex items-center gap-2">
            <Radar size={20} className="text-brand-600" aria-hidden />
            Addendum Watcher
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {applied
              ? `Version 2 · Addendum ${addendum.number}, published ${formatShortDate(addendum.publishedOn)}`
              : 'Version 1 · When this tender changes, we show what changed and check your documents again.'}
          </p>
        </div>
        <span className="chip chip-ok">
          <span className="h-2 w-2 animate-pulse rounded-full bg-ok-500" aria-hidden />
          Watching
        </span>
      </div>

      {!addendum && <p className="text-sm text-ink-soft">No changes to this tender so far.</p>}

      {addendum && !applied && step === null && (
        <div className="flex flex-col gap-3 rounded-tile bg-canvas p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-ink">Got an addendum from the procuring entity? Upload it to see what changed.</p>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) start(file.name);
              e.target.value = '';
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => fileInput.current?.click()}>
              <FileUp size={16} aria-hidden /> Upload addendum
            </Button>
            <Button variant="outlined" onClick={() => start(addendum.fileName)}>
              Use the sample
            </Button>
          </div>
        </div>
      )}

      {step !== null && (
        <div className="rounded-tile bg-canvas p-4" role="status" aria-live="polite">
          <p className="mb-3 text-sm font-semibold text-ink">{fileName}</p>
          <ol className="space-y-2">
            {STEPS.map((label, i) => (
              <li key={label} className={`flex items-center gap-3 text-sm ${i > step ? 'text-muted' : 'text-ink'}`}>
                {i < step ? (
                  <Check size={16} className="shrink-0 text-ok-500" aria-label="Done" />
                ) : i === step ? (
                  <Loader2 size={16} className="shrink-0 animate-spin text-brand-600" aria-label="In progress" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-line" aria-hidden />
                )}
                {label}
              </li>
            ))}
          </ol>
        </div>
      )}

      {addendum && applied && (
        <div aria-live="polite">
          <h3 className="mb-2 text-sm font-bold text-ink">What changed ({addendum.changes.length})</h3>
          <ul className="mb-6 space-y-3">
            {addendum.changes.map((change) => (
              <li key={change.category} className="rounded-tile border border-line p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">{CHANGE_LABEL[change.category]}</p>
                {change.oldQuote && (
                  <p className="mb-1 text-sm text-ink-soft">
                    <span className="sr-only">Before: </span>
                    <del>“{change.oldQuote}”</del>
                  </p>
                )}
                <p className="text-sm text-ink">
                  <span className="sr-only">{change.oldQuote ? 'Now: ' : 'Added: '}</span>
                  <ins className="rounded bg-accent-50 px-1 no-underline">“{change.newQuote}”</ins>
                </p>
              </li>
            ))}
          </ul>

          <h3 className="mb-2 text-sm font-bold text-ink">What this means for your documents</h3>
          <ul className="mb-4 space-y-2">
            {addendum.flips.map((flip) => (
              <li key={flip.document} className="rounded-tile bg-canvas p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{flip.document}</span>
                  <StateChip state={flip.from} />
                  <ArrowRight size={14} className="text-ink-soft" aria-label="now" />
                  <StateChip state={flip.to} />
                </div>
                <p className="text-sm text-ink-soft">{flip.reason}</p>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/alerts" className="btn btn-secondary px-4 text-sm">
              See the alert
            </Link>
            <button
              type="button"
              onClick={() => resetAddendum(tenderId)}
              className="min-h-11 px-2 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Reset demo
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
