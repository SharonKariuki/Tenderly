import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, StatusChip, ProgressBar, Page, PageHeading, FilterTabs, Notice } from '../components/ui';
import { UploadButton } from '../components/UploadButton';
import { mockDocuments } from '../data/mock';
import { CATEGORY, docTypeFor, needsAction } from '../lib/documents';
import { daysUntil, formatDate } from '../lib/format';
import { Plus, Search } from 'lucide-react';

type Filter = 'all' | 'action' | 'ready' | 'optional';

export function Documents() {
  const [params, setParams] = useSearchParams();
  const filter = (['action', 'ready', 'optional'].includes(params.get('filter') ?? '') ? params.get('filter') : 'all') as Filter;
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'ok' | 'warn' } | null>(null);
  const onMessage = (text: string, tone: 'info' | 'ok' | 'warn') => setMessage({ text, tone });

  const required = mockDocuments.filter((d) => !d.isOptional);
  const readyCount = required.filter((d) => d.status === 'ready').length;

  const filteredDocs = mockDocuments.filter((d) => {
    if (query && !d.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'ready') return d.status === 'ready';
    if (filter === 'action') return needsAction(d);
    if (filter === 'optional') return d.isOptional;
    return true;
  });

  const expiring = mockDocuments
    .filter((d) => d.expiryDate)
    .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''))
    .slice(0, 3);

  return (
    <Page>
      <PageHeading title="Documents" subtitle="Keep your papers ready, and more tenders open up.">
        <UploadButton docType="other" name="document" onMessage={onMessage} className="btn btn-primary self-start px-5 text-sm">
          <Plus size={18} aria-hidden /> Add document
        </UploadButton>
      </PageHeading>

      {message && (
        <div className="mb-6">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}

      <section className="mb-8 grid gap-8 border-b border-line pb-8 lg:grid-cols-[1fr_1.6fr]" aria-label="Summary">
        <div>
          <p className="font-display text-5xl font-bold tabular-nums text-ink">
            {readyCount}
            <span className="text-2xl text-muted"> / {required.length}</span>
          </p>
          <p className="mb-3 text-ink-soft">needed documents are ready</p>
          <div className="max-w-xs">
            <ProgressBar value={readyCount} max={required.length} label="Needed documents ready" />
          </div>
        </div>
        <div>
          <h2 className="h2 mb-2">Expiry dates</h2>
          <ul className="divide-y divide-line border-y border-line">
            {expiring.map((doc) => {
              const left = daysUntil(doc.expiryDate!);
              return (
                <li key={doc.id}>
                  <Link to={`/documents/${doc.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-paper-deep sm:px-2">
                    <span className="text-sm font-bold text-ink">{doc.name}</span>
                    <span className={`text-sm font-bold ${left < 0 ? 'text-danger-600' : left <= 60 ? 'text-accent-700' : 'text-ink-soft'}`}>
                      {left < 0 ? `Expired ${formatDate(doc.expiryDate!)}` : `Expires ${formatDate(doc.expiryDate!)}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <FilterTabs
          label="Filter documents"
          value={filter}
          onChange={(id) => setParams(id === 'all' ? {} : { filter: id }, { replace: true })}
          options={[
            { id: 'all', label: 'All', count: mockDocuments.length },
            { id: 'action', label: 'Needs action', count: mockDocuments.filter(needsAction).length },
            { id: 'ready', label: 'Ready', count: mockDocuments.filter((d) => d.status === 'ready').length },
            { id: 'optional', label: 'Optional', count: mockDocuments.filter((d) => d.isOptional).length },
          ]}
        />
        <label className="relative block md:w-72">
          <span className="sr-only">Search documents</span>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input type="search" placeholder="Search documents" value={query} onChange={(e) => setQuery(e.target.value)} className="input pl-10" />
        </label>
      </div>

      <ul className="divide-y divide-line border-y border-line">
        {filteredDocs.map((doc) => {
          const { label } = CATEGORY[doc.category];
          const expired = doc.expiryDate ? daysUntil(doc.expiryDate) < 0 : false;
          return (
            <li key={doc.id} className="grid gap-x-6 gap-y-3 py-4 sm:px-3 md:grid-cols-[1fr_8.5rem_10rem_auto] md:items-center">
              <div className="min-w-0">
                <Link to={`/documents/${doc.id}`} className="font-bold text-ink hover:text-brand-700 hover:underline">
                  {doc.name}
                </Link>
                <p className="text-sm text-ink-soft">
                  {label} · needed for {doc.requiredByCount} tender{doc.requiredByCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div>
                <StatusChip status={doc.status} />
              </div>
              <p className={`text-sm ${expired ? 'font-bold text-danger-600' : 'text-ink-soft'}`}>
                {doc.expiryDate
                  ? `${expired ? 'Expired' : 'Expires'} ${formatDate(doc.expiryDate)}`
                  : doc.issueDate
                    ? 'Does not expire'
                    : 'Not added yet'}
              </p>
              <div className="flex gap-2">
                <Link to={`/documents/${doc.id}`} className="btn btn-outlined px-4 text-sm">
                  Details
                </Link>
                <UploadButton
                  docType={docTypeFor(doc)}
                  name={doc.name.toLowerCase()}
                  onMessage={onMessage}
                  className={`btn px-4 text-sm ${
                    doc.status === 'ready' ? 'btn-secondary' : doc.status === 'missing' ? 'btn-primary' : 'btn-accent'
                  }`}
                >
                  {doc.status === 'ready' ? 'Replace' : doc.status === 'missing' ? 'Upload' : 'Renew'}
                </UploadButton>
              </div>
            </li>
          );
        })}
      </ul>

      {filteredDocs.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-ink-soft">No documents match{query ? ` "${query}"` : ' this filter'}.</p>
        </Card>
      )}
    </Page>
  );
}
