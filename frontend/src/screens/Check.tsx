import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Button, ProgressBar, Page, PageHeading, Notice } from '../components/ui';
import { tendersApi } from '../api/client';
import { AlertTriangle, CheckCircle, Shield, Upload, XCircle } from 'lucide-react';

type Result = 'genuine' | 'suspicious';

const STEPS = ['Read the tender', 'Look for signs of a scam', 'Check if you qualify'];

const SIGNALS: { label: string; genuine: string; suspicious: string | null }[] = [
  { label: 'Listed on the government tenders website', genuine: 'Found on tenders.go.ke', suspicious: 'Not on the government tenders website' },
  { label: 'Official email address', genuine: 'Emails end in .go.ke, like real government offices', suspicious: 'Uses a personal email like Gmail' },
  { label: 'No money asked for', genuine: 'Nobody asks you to pay them', suspicious: 'Asks you to pay KES 5,000 to confirm your bid' },
  { label: 'Bid deposit goes to the office', genuine: 'Any deposit is paid to the county itself', suspicious: 'Deposit goes to a personal M-Pesa number' },
  { label: 'Enough time to apply', genuine: '16 days to the deadline', suspicious: null },
];

const REQUIREMENTS = [
  { label: 'Tax clearance certificate', met: true },
  { label: 'Business registration', met: true },
  { label: 'Credit report', met: true },
  { label: 'Tax PIN certificate', met: true },
  { label: 'Insurance certificate', met: false },
  { label: 'Bank reference', met: false },
];

// Quick warning signs in pasted text. Guidance only; the full check runs on an uploaded PDF.
const TEXT_FLAGS: { test: RegExp; flag: string }[] = [
  { test: /m-?pesa|till\s*(no|number)|paybill/i, flag: 'Asks you to pay by M-Pesa, till or paybill' },
  { test: /@(gmail|yahoo|outlook|hotmail)\./i, flag: 'Uses a personal email address' },
  { test: /(fee|pay|deposit).{0,30}(confirm|secure|process|register)/i, flag: 'Asks for money to confirm or hold your bid' },
  { test: /urgent|today only|within 24 ?h/i, flag: 'Rushes you to act today' },
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
      setNotice(`${file.name} is uploaded. Its results will show under Tenders.`);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setNotice(
        status === 401
          ? 'Please sign in to check your own PDF. Your file was not sent. You can try a sample tender below.'
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
      <Page className="max-w-4xl">
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
                  ? 'Found on the government tenders website · Nairobi City County · closes 20 Oct 2026'
                  : 'Sent by email from an unknown sender · asks for money first'}
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
              className="btn btn-danger px-5 text-sm"
            >
              Report it to the tenders regulator
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
                  <li key={s.label} className={`flex gap-3 rounded-tile p-3 ${flagged ? 'bg-danger-50' : 'bg-ok-50'}`}>
                    {flagged ? (
                      <XCircle size={20} className="text-danger-600 flex-shrink-0 mt-0.5" aria-label="Warning" />
                    ) : (
                      <CheckCircle size={20} className="text-ok-500 flex-shrink-0 mt-0.5" aria-label="OK" />
                    )}
                    <div>
                      <p className="font-semibold text-sm text-ink">{s.label}</p>
                      <p className="text-sm text-ink-soft">{flagged ? s.suspicious : s.genuine}</p>
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
                <p className="text-4xl font-light text-brand-700 tabular-nums">
                  {met} <span className="text-xl text-ink-soft">of {REQUIREMENTS.length} requirements met</span>
                </p>
                <div className="mt-3 mb-4">
                  <ProgressBar value={met} max={REQUIREMENTS.length} />
                </div>
                <ul className="space-y-1">
                  {REQUIREMENTS.map((r) => (
                    <li key={r.label} className="flex min-h-[44px] items-center gap-3">
                      {r.met ? (
                        <CheckCircle size={18} className="text-ok-500 flex-shrink-0" aria-label="Met" />
                      ) : (
                        <XCircle size={18} className="text-danger-600 flex-shrink-0" aria-label="Missing" />
                      )}
                      <span className="text-sm text-ink">{r.label}</span>
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
              <p className="text-ink-soft">
                We did not check if you qualify because this tender shows signs of a scam. Do not pay anything until you
                find it on the government tenders website.
              </p>
            )}
          </Card>
        </div>

        <p className="rounded-tile bg-white p-4 shadow-card text-sm text-ink">
          <strong>This is advice only.</strong> It is not an official decision. Always find the tender on{' '}
          <a href="https://tenders.go.ke/" target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">
            the government tenders website
          </a>{' '}
          before you send a bid.
        </p>
      </Page>
    );
  }

  return (
    <Page className="max-w-4xl">
      <PageHeading title="Check a tender" subtitle="Before you spend time and money, check that it is real and that you qualify." />

      {step !== null && (
        <Card className="p-6 mb-6">
          <h2 className="h2 mb-4">Checking…</h2>
          <ol className="space-y-2" aria-live="polite">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={`flex items-center gap-3 rounded-tile p-3 text-sm ${
                  i === step ? 'bg-brand-600 text-white' : i < step ? 'bg-ok-50 text-ink' : 'bg-brand-50 text-ink-soft'
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
          className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
            dragging ? 'border-brand-600 bg-brand-50' : 'border-brand-200'
          }`}
        >
          <span className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Upload size={26} className="text-brand-700" aria-hidden />
          </span>
          <h2 className="h2 mb-1">Drop your tender PDF here</h2>
          <p className="text-ink-soft text-sm mb-5">or choose it from your device</p>
          <Button variant="primary" onClick={() => fileInput.current?.click()}>
            Browse files
          </Button>
        </div>
        {notice && (
          <div className="mt-4">
            <Notice>{notice}</Notice>
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm text-ink-soft">No PDF yet? Try an example:</span>
          <Button variant="outlined" size="sm" disabled={step !== null} onClick={() => runDemo('genuine')}>
            Try a real-looking tender
          </Button>
          <Button variant="accent" size="sm" disabled={step !== null} onClick={() => runDemo('suspicious')}>
            Try a scam example
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="h2 mb-1">Got it on WhatsApp or by email?</h2>
        <p className="text-sm text-ink-soft mb-4">Paste the message and we will look for common scam signs.</p>
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
          <div className={`mt-4 rounded-tile p-4 text-sm ${textFlags.length ? 'bg-danger-50' : 'bg-ok-50'}`} role="status">
            {textFlags.length ? (
              <>
                <p className="font-semibold text-ink mb-1">Be careful. We found {textFlags.length} warning sign{textFlags.length > 1 ? 's' : ''}:</p>
                <ul className="list-disc pl-5 text-ink">
                  {textFlags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-ink">No common scam signs found. Still find it on the government tenders website before you pay or send anything.</p>
            )}
          </div>
        )}
      </Card>
    </Page>
  );
}
