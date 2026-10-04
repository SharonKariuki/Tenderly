import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackLink, Card, Notice, NotFound, Page, StatusChip } from '../components/ui';
import { UploadButton } from '../components/UploadButton';
import { mockDocuments } from '../data/mock';
import { CATEGORY, docTypeFor, tendersNeeding } from '../lib/documents';
import { daysUntil, formatDate } from '../lib/format';
import { ChevronRight } from 'lucide-react';

export function DocumentDetail() {
  const { id } = useParams();
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'ok' | 'warn' } | null>(null);
  const doc = mockDocuments.find((d) => d.id === Number(id));
  if (!doc) return <NotFound what="document" back="/documents" backLabel="Back to documents" />;

  const { label, icon: Icon, tile } = CATEGORY[doc.category];
  const expired = doc.expiryDate ? daysUntil(doc.expiryDate) < 0 : false;
  const needing = tendersNeeding(doc);
  const action = doc.status === 'ready' ? 'Replace it' : doc.status === 'missing' ? 'Upload it' : 'Upload the new one';

  return (
    <Page className="max-w-3xl">
      <BackLink to="/documents">Back to documents</BackLink>

      <Card className="mb-6 p-6">
        <div className="flex items-start gap-4">
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tile}`}>
            <Icon size={26} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="h1">{doc.name}</h1>
            <p className="mt-1 text-sm text-ink-soft">{label}</p>
          </div>
          <StatusChip status={doc.status} />
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-tile bg-canvas p-3">
            <dt className="text-xs text-ink-soft">Issued</dt>
            <dd className="text-sm font-semibold text-ink">{doc.issueDate ? formatDate(doc.issueDate) : 'Not uploaded yet'}</dd>
          </div>
          <div className={`rounded-tile p-3 ${expired ? 'bg-danger-50' : 'bg-canvas'}`}>
            <dt className={`text-xs ${expired ? 'text-danger-600' : 'text-ink-soft'}`}>{expired ? 'Expired' : 'Expires'}</dt>
            <dd className={`text-sm font-semibold ${expired ? 'text-danger-600' : 'text-ink'}`}>
              {doc.expiryDate ? formatDate(doc.expiryDate) : doc.issueDate ? 'Never' : 'Not known'}
            </dd>
          </div>
          <div className="rounded-tile bg-canvas p-3">
            <dt className="text-xs text-ink-soft">Needed for</dt>
            <dd className="text-sm font-semibold text-ink">
              {doc.requiredByCount} tender{doc.requiredByCount === 1 ? '' : 's'}
            </dd>
          </div>
        </dl>

        {expired && <p className="mt-4 text-sm text-danger-600">This has expired. Get a new one and upload it so it counts again.</p>}
        {doc.status === 'missing' && <p className="mt-4 text-sm text-ink-soft">You have not added this yet. Tenders that ask for it will show you as not ready.</p>}

        <div className="mt-5">
          <UploadButton
            docType={docTypeFor(doc)}
            name={doc.name.toLowerCase()}
            onMessage={(text, tone) => setMessage({ text, tone })}
            className={`btn px-5 text-sm ${doc.status === 'ready' ? 'btn-outlined' : 'btn-primary'}`}
          >
            {action}
          </UploadButton>
        </div>
        {message && (
          <div className="mt-4">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="h2 mb-3">Your tenders that ask for it</h2>
        {needing.length ? (
          <ul className="space-y-1">
            {needing.map((t) => (
              <li key={t.id}>
                <Link to={`/tenders/${t.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 text-sm hover:bg-brand-50">
                  <span className="text-ink">{t.title}</span>
                  <ChevronRight size={16} className="shrink-0 text-ink-soft" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">None of your current matches ask for it, but other tenders do.</p>
        )}
      </Card>
    </Page>
  );
}
