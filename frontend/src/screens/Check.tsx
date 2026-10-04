import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Button, ProgressBar } from '../components/ui';
import { tendersApi } from '../api/client';
import { AlertTriangle, CheckCircle, Shield, Upload, XCircle } from 'lucide-react';

type Result = 'genuine' | 'suspicious';

const STEPS = ['Read the tender text', 'Look for fraud signals', 'Check your eligibility'];

const SIGNALS: { label: string; genuine: string; suspicious: string | null }[] = [
  { label: 'Listed on the official portal', genuine: 'Found on tenders.go.ke', suspicious: 'Not found on the official portal' },
  { label: 'Official contact address', genuine: 'Contacts use .go.ke addresses', suspicious: 'Contact is a personal email' },
  { label: 'No fee paid to a person', genuine: 'No personal fees mentioned', suspicious: 'Asks for KES 5,000 to confirm the bid' },
  { label: 'Bid security paid to the institution', genuine: 'Bond payable to the county', suspicious: 'Bond payable to a personal M-Pesa number' },
  { label: 'Reasonable timeline', genuine: '16 days to deadline', suspicious: null },
];

const REQUIREMENTS = [
  { label: 'Tax compliance certificate', met: true },
  { label: 'Business registration', met: true },
  { label: 'CRB report', met: true },
  { label: 'KRA PIN certificate', met: true },
  { label: 'Insurance certificate', met: false },
  { label: 'Bank reference', met: false },
];

// Quick red flags in pasted text. Guidance only; the full check runs on an uploaded PDF.
const TEXT_FLAGS: { test: RegExp; flag: string }[] = [
  { test: /m-?pesa|till\s*(no|number)|paybill/i, flag: 'Asks for payment by M-Pesa, till or paybill' },
  { test: /@(gmail|yahoo|outlook|hotmail)\./i, flag: 'Uses a personal email address' },
  { test: /(fee|pay|deposit).{0,30}(confirm|secure|process|register)/i, flag: 'Asks for a fee to confirm or secure the bid' },
  { test: /urgent|today only|within 24 ?h/i, flag: 'Pushes you to act very fast' },
];

export function Check() {
  const navigate = useNavigate();
  const [result, setResult] = useState<Result | null>(null);
  const [step, setStep] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [textFlags, setTextFlags] = useState<string[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const runDemo = (type: Result) => {
    setNotice(null);
    setStep(0);
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setStep((s) => {
        const next = (s ?? 0) + 1;
        if (next >= STEPS.length) {
          window.clearInterval(timer.current);
          setResult(type);
          return null;
        }
        return next;
      });
    }, 900);
  };

  const uploadPdf = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setNotice('Please choose a PDF file.');
      return;
    }
    setNotice(`Uploading ${file.name}…`);
    try {
      await tendersApi.upload(file);
      setNotice(`${file.name} uploaded. Its check will appear under Tenders.`);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setNotice(
        status === 401
          ? 'Sign in to check your own PDF. Your file was not sent. Meanwhile, try a demo tender.'
          : `Could not upload ${file.name}. Check your connection and try again.`,
      );
    }
  };

  const reset = () => {
    setResult(null);
    setNotice(null);
    setTextFlags(null);
  };

  if (result) {
    const genuine = result === 'genuine';
    const met = REQUIREMENTS.filter((r) => r.met).length;
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <Card scam={!genuine} hero={genuine} className="p-6 sm:p-8 mb-6">
          <div className="relative z-10 flex items-start gap-4 sm:gap-6">
            <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              {genuine ? <Shield size={28} aria-hidden /> : <AlertTriangle size={28} aria-hidden />}
            </span>
            <div>
              <h1 className="text-2xl sm:text-4xl font-semibold mb-2">
                {genuine ? 'This tender looks genuine' : 'This tender looks suspicious'}
              </h1>
              <p className="text-white/85">
                {genuine
                  ? 'Source: official portal · Nairobi City County · closes 20 Oct 2026'
                  : 'Source: email · unverified sender · asks for an upfront fee'}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex gap-3 mb-8 flex-wrap">
          {genuine ? (
            <Button variant="primary" onClick={() => navigate('/tenders')}>
              Go to my tenders
            </Button>
          ) : (
            <a
              href="https://ppra.go.ke/"
              target="_blank"
              rel="noreferrer"
              className="btn btn-coral"
            >
              Report it to PPRA
            </a>
          )}
          <Button variant="outlined" onClick={reset}>
            Check another
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="h2 mb-4">Is it genuine?</h2>
            <ul className="space-y-2">
              {SIGNALS.map((s) => {
                const flagged = !genuine && s.suspicious !== null;
                return (
                  <li key={s.label} className={`flex gap-3 rounded-tile p-3 ${flagged ? 'bg-coral/10' : 'bg-ok-solid/10'}`}>
                    {flagged ? (
                      <XCircle size={20} className="text-coral flex-shrink-0 mt-0.5" aria-label="Warning" />
                    ) : (
                      <CheckCircle size={20} className="text-ok-solid flex-shrink-0 mt-0.5" aria-label="OK" />
                    )}
                    <div>
                      <p className="font-semibold text-sm text-plum-ink">{s.label}</p>
                      <p className="text-sm text-plum-muted">{flagged ? s.suspicious : s.genuine}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="h2 mb-4">Do you qualify?</h2>
            {genuine ? (
              <>
                <p className="text-4xl font-light text-plum tabular-nums">
                  {met} <span className="text-xl text-plum-muted">of {REQUIREMENTS.length} requirements met</span>
                </p>
                <div className="mt-3 mb-4">
                  <ProgressBar value={met} max={REQUIREMENTS.length} />
                </div>
                <ul className="space-y-1">
                  {REQUIREMENTS.map((r) => (
                    <li key={r.label} className="flex min-h-[44px] items-center gap-3">
                      {r.met ? (
                        <CheckCircle size={18} className="text-ok-solid flex-shrink-0" aria-label="Met" />
                      ) : (
                        <XCircle size={18} className="text-coral flex-shrink-0" aria-label="Missing" />
                      )}
                      <span className="text-sm text-plum-ink">{r.label}</span>
                      {!r.met && (
                        <Button variant="secondary" size="sm" className="ml-auto" onClick={() => navigate('/documents')}>
                          Upload
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-plum-soft">
                We did not check eligibility because this tender shows fraud signals. Do not pay anything until you
                confirm it on the official portal.
              </p>
            )}
          </Card>
        </div>

        <p className="rounded-tile border border-plum/15 bg-white/70 p-4 text-sm text-plum-ink">
          <strong>Guidance only.</strong> This check is not an official decision. Always confirm on{' '}
          <a href="https://tenders.go.ke/" target="_blank" rel="noreferrer" className="font-semibold text-plum underline">
            the official portal
          </a>{' '}
          before you submit a bid.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <h1 className="h1 mb-2">Check a tender</h1>
      <p className="text-lg text-plum-soft mb-8">Before you spend time and money, check that it is real and that you qualify.</p>

      {step !== null && (
        <Card className="p-6 mb-6">
          <h2 className="h2 mb-4">Checking…</h2>
          <ol className="space-y-2" aria-live="polite">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={`flex items-center gap-3 rounded-tile p-3 text-sm ${
                  i === step ? 'bg-plum text-white' : i < step ? 'bg-ok-solid/10 text-plum-ink' : 'bg-blush/50 text-plum-muted'
                }`}
              >
                {i < step ? <CheckCircle size={18} aria-hidden /> : <span className="w-[18px] text-center tabular-nums">{i + 1}</span>}
                {label}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadPdf(file);
          e.target.value = '';
        }}
      />

      <Card className="p-6 sm:p-8 mb-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) uploadPdf(file);
          }}
          className={`rounded-card border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
            dragging ? 'border-plum bg-blush/60' : 'border-plum/20'
          }`}
        >
          <span className="w-14 h-14 bg-blush rounded-full flex items-center justify-center mx-auto mb-3">
            <Upload size={26} className="text-plum" aria-hidden />
          </span>
          <h2 className="h2 mb-1">Drop your tender PDF here</h2>
          <p className="text-plum-muted text-sm mb-5">or choose it from your device</p>
          <Button variant="primary" onClick={() => fileInput.current?.click()}>
            Browse files
          </Button>
        </div>
        {notice && (
          <p className="mt-4 rounded-tile bg-blush p-3 text-sm text-plum-ink" role="status">
            {notice}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm text-plum-muted">No PDF to hand?</span>
          <Button variant="outlined" size="sm" disabled={step !== null} onClick={() => runDemo('genuine')}>
            Use a demo tender
          </Button>
          <Button variant="outlined" size="sm" disabled={step !== null} onClick={() => runDemo('suspicious')}>
            Try a suspicious one
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="h2 mb-1">Got it on WhatsApp or by email?</h2>
        <p className="text-sm text-plum-muted mb-4">Paste the message for a quick check for common scam signs.</p>
        <form
          className="flex flex-col sm:flex-row gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTextFlags(TEXT_FLAGS.filter((f) => f.test.test(pasted)).map((f) => f.flag));
          }}
        >
          <label htmlFor="pasted-tender" className="sr-only">
            Tender message
          </label>
          <textarea
            id="pasted-tender"
            rows={3}
            placeholder="Paste the tender details or link here"
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              setTextFlags(null);
            }}
            className="input flex-1 min-w-0 resize-y"
          />
          <Button type="submit" variant="primary" disabled={!pasted.trim()} className="sm:self-start">
            Check it
          </Button>
        </form>
        {textFlags && (
          <div className={`mt-4 rounded-tile p-4 text-sm ${textFlags.length ? 'bg-coral/10' : 'bg-ok-solid/10'}`} role="status">
            {textFlags.length ? (
              <>
                <p className="font-semibold text-plum-ink mb-1">Be careful. We found {textFlags.length} warning sign{textFlags.length > 1 ? 's' : ''}:</p>
                <ul className="list-disc pl-5 text-plum-ink">
                  {textFlags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-plum-ink">No common scam signs found. Still confirm it on the official portal before you pay or submit anything.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
