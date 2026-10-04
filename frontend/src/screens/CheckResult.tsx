import { useNavigate, useParams } from 'react-router-dom';
import { BackLink, Card, Button, ProgressBar, Page } from '../components/ui';
import { AlertTriangle, CheckCircle, Shield, XCircle } from 'lucide-react';

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

export function CheckResult() {
  const navigate = useNavigate();
  const { type } = useParams();
  const reset = () => navigate('/check');
    const genuine = type !== 'scam';
    const met = REQUIREMENTS.filter((r) => r.met).length;
    return (
      <Page className="max-w-4xl">
        <BackLink to="/check">Back to Check a tender</BackLink>
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
