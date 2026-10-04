import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, StatusChip, ProgressBar, Page, PageHeading, FilterTabs, Notice } from '../components/ui';
import { UploadButton } from '../components/UploadButton';
import { mockDocuments, mockTenders } from '../data/mock';
import { BusinessDocument } from '../lib/types';
import { daysUntil, formatDate } from '../lib/format';
import { Accessibility, Banknote, Building2, Calendar, ChevronDown, FileCheck, FileText, Landmark, Plus, Search, ShieldCheck, Users } from 'lucide-react';

type Filter = 'all' | 'action' | 'ready' | 'optional';

const CATEGORY: Record<BusinessDocument['category'], { label: string; icon: typeof FileText; tile: string }> = {
  crb: { label: 'Shows you pay your debts', icon: FileText, tile: 'bg-ok-50 text-ok-700' },
  taxCompliance: { label: 'Shows your taxes are paid up', icon: FileCheck, tile: 'bg-accent-50 text-accent-700' },
  tin: { label: 'Your tax number from KRA', icon: Landmark, tile: 'bg-ok-50 text-ok-700' },
  businessRegistration: { label: 'Shows your business is registered', icon: Building2, tile: 'bg-ok-50 text-ok-700' },
  insurance: { label: 'Your business insurance cover', icon: ShieldCheck, tile: 'bg-danger-50 text-danger-600' },
  bank: { label: 'A letter from your bank', icon: Banknote, tile: 'bg-ok-50 text-ok-700' },
  ncpwd: { label: 'Proves a disability for reserved tenders', icon: Accessibility, tile: 'bg-brand-50 text-brand-600' },
  owners: { label: 'Who owns and runs your company', icon: Users, tile: 'bg-brand-50 text-brand-600' },
  other: { label: 'Lets you bid on tenders kept for these groups', icon: FileText, tile: 'bg-brand-50 text-brand-600' },
};

// The backend's DocType for each card (core/contracts.py).
function docTypeFor(doc: BusinessDocument): string {
  if (doc.category === 'other' && /women|youth|disability/i.test(doc.name)) return 'agpo_certificate';
  return (
    {
      taxCompliance: 'kra_tax_compliance',
      businessRegistration: 'business_registration',
      bank: 'bank_statement',
      ncpwd: 'ncpwd_registration',
      owners: 'cr12',
    } as Record<string, string>
  )[doc.category] ?? 'other';
}

const needsAction = (d: BusinessDocument) => d.status === 'actionNeeded' || d.status === 'missing';
const tendersNeeding = (doc: BusinessDocument) =>
  mockTenders.filter((t) => t.requiredDocs.some((r) => r.toLowerCase() === doc.name.toLowerCase()));

export function Documents() {
  const [params, setParams] = useSearchParams();
  const filter = (['action', 'ready', 'optional'].includes(params.get('filter') ?? '') ? params.get('filter') : 'all') as Filter;
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
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

      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card hero className="relative overflow-hidden p-7">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" aria-hidden />
          <h2 className="text-base font-semibold">Document health</h2>
          <p className="mt-3 text-5xl font-light tabular-nums">
            {readyCount}
            <span className="text-xl text-white/85"> of {required.length} needed are ready</span>
          </p>
          <div className="mt-6">
            <ProgressBar value={readyCount} max={required.length} tone="dark" label="Needed documents ready" />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="h2 mb-4">Expiry dates</h2>
          <ul className="space-y-2">
            {expiring.map((doc) => {
              const left = daysUntil(doc.expiryDate!);
              return (
                <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-tile bg-canvas p-3">
                  <span className="flex items-center gap-3 text-sm font-medium text-ink">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                      <Calendar size={16} aria-hidden />
                    </span>
                    {doc.name}
                  </span>
                  <span className={`text-sm font-semibold ${left < 0 ? 'text-danger-600' : 'text-accent-700'}`}>
                    {left < 0 ? `Expired ${formatDate(doc.expiryDate!)}` : `Expires ${formatDate(doc.expiryDate!)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

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

      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredDocs.map((doc) => {
          const { label, icon: Icon, tile } = CATEGORY[doc.category];
          const expired = doc.expiryDate ? daysUntil(doc.expiryDate) < 0 : false;
          const open = openId === doc.id;
          const needing = tendersNeeding(doc);
          return (
            <li
              key={doc.id}
              className={`card flex flex-col p-5 ${
                doc.status === 'missing' ? 'ring-2 ring-danger-500/40' : doc.status === 'actionNeeded' ? 'ring-2 ring-warn-500/50' : ''
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tile}`}>
                  <Icon size={21} aria-hidden />
                </span>
                <StatusChip status={doc.status} />
              </div>
              <h3 className="text-sm font-semibold text-ink">{doc.name}</h3>
              <p className="mb-3 text-xs text-ink-soft">{label}</p>
              {(doc.issueDate || doc.expiryDate) && (
                <dl className="mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-canvas p-2">
                    <dt className="text-ink-soft">Issued</dt>
                    <dd className="font-medium text-ink">{doc.issueDate ? formatDate(doc.issueDate) : 'Not known'}</dd>
                  </div>
                  <div className={`rounded-lg p-2 ${expired ? 'bg-danger-50' : 'bg-canvas'}`}>
                    <dt className={expired ? 'text-danger-600' : 'text-ink-soft'}>{expired ? 'Expired' : 'Expires'}</dt>
                    <dd className={`font-medium ${expired ? 'text-danger-600' : 'text-ink'}`}>
                      {doc.expiryDate ? formatDate(doc.expiryDate) : 'Never'}
                    </dd>
                  </div>
                </dl>
              )}
              <p className="mb-4 text-xs text-ink-soft">
                Needed for {doc.requiredByCount} tender{doc.requiredByCount !== 1 ? 's' : ''}
              </p>
              {open && (
                <div id={`doc-${doc.id}`} className="mb-4 rounded-lg bg-brand-50 p-3 text-xs text-ink">
                  {needing.length ? (
                    <>
                      <p className="mb-1 font-semibold">Your matches that ask for it:</p>
                      <ul className="list-disc pl-4">
                        {needing.map((t) => (
                          <li key={t.id}>{t.title}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p>None of your current matches ask for it, but other tenders do.</p>
                  )}
                </div>
              )}
              <div className="mt-auto flex gap-2">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`doc-${doc.id}`}
                  onClick={() => setOpenId(open ? null : doc.id)}
                  className="btn btn-secondary flex-1 px-3 text-sm"
                >
                  Details <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                </button>
                <UploadButton
                  docType={docTypeFor(doc)}
                  name={doc.name.toLowerCase()}
                  onMessage={onMessage}
                  className={`btn flex-1 px-3 text-sm ${
                    doc.status === 'ready' ? 'btn-outlined' : doc.status === 'missing' ? 'btn-primary' : 'btn-accent'
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
