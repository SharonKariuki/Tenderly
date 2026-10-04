import { useRef, useState } from 'react';
import axios from 'axios';
import { Card, Button, StatusChip, ProgressBar } from '../components/ui';
import { mockDocuments } from '../data/mock';
import { documentsApi } from '../api/client';
import { BusinessDocument } from '../lib/types';
import { daysUntil, formatDate } from '../lib/format';
import { Accessibility, Banknote, Building2, Calendar, FileCheck, FileText, Landmark, Search, ShieldCheck, Upload } from 'lucide-react';

type Filter = 'all' | 'action' | 'ready' | 'optional';

const CATEGORY: Record<BusinessDocument['category'], { label: string; icon: typeof FileText }> = {
  crb: { label: 'Credit report', icon: FileText },
  taxCompliance: { label: 'Tax', icon: FileCheck },
  tin: { label: 'KRA PIN', icon: Landmark },
  businessRegistration: { label: 'Registration', icon: Building2 },
  insurance: { label: 'Insurance', icon: ShieldCheck },
  bank: { label: 'Bank', icon: Banknote },
  ncpwd: { label: 'NCPWD', icon: Accessibility },
  other: { label: 'Other', icon: FileText },
};

// The backend's DocType for each card (core/contracts.py).
function docTypeFor(doc: BusinessDocument): string {
  if (/agpo/i.test(doc.name)) return 'agpo_certificate';
  return (
    {
      taxCompliance: 'kra_tax_compliance',
      businessRegistration: 'business_registration',
      bank: 'bank_statement',
      ncpwd: 'ncpwd_registration',
    } as Record<string, string>
  )[doc.category] ?? 'other';
}

const needsAction = (d: BusinessDocument) => d.status === 'actionNeeded' || d.status === 'missing';

export function Documents() {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<BusinessDocument | null>(null);

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

  const pickFile = (doc: BusinessDocument | null) => {
    uploadFor.current = doc;
    fileInput.current?.click();
  };

  const upload = async (file: File) => {
    const doc = uploadFor.current;
    setNotice(`Uploading ${file.name}…`);
    try {
      await documentsApi.upload(file, doc ? docTypeFor(doc) : 'other');
      setNotice(`${file.name} uploaded. We will read it and update this page.`);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setNotice(
        status === 401
          ? 'Sign in to upload documents. Your file was not sent.'
          : `Could not upload ${file.name}. Check your connection and try again.`,
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = '';
        }}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
        <div>
          <h1 className="h1 mb-2">Documents</h1>
          <p className="text-lg text-plum-soft">Keep your paperwork ready, and opportunities unlock.</p>
        </div>
        <Button variant="primary" onClick={() => pickFile(null)}>
          <Upload size={18} aria-hidden /> Add document
        </Button>
      </div>

      {notice && (
        <p className="mb-6 rounded-tile bg-blush p-4 text-sm text-plum-ink" role="status">
          {notice}
        </p>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card hero className="p-6">
          <div className="relative z-10">
            <h2 className="h2 text-white mb-4">Document health</h2>
            <p className="text-5xl font-light tabular-nums">
              {readyCount}
              <span className="text-2xl text-white/70"> / {required.length}</span>
            </p>
            <p className="text-white/85 mb-5">required documents ready</p>
            <ProgressBar value={readyCount} max={required.length} tone="dark" />
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="h2 mb-4">Expiry dates</h2>
          <ul className="space-y-2">
            {expiring.map((doc) => {
              const left = daysUntil(doc.expiryDate!);
              return (
                <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-tile bg-blush/50 p-3">
                  <span className="flex items-center gap-3 font-semibold text-sm text-plum-ink">
                    <Calendar size={18} className={left < 0 ? 'text-coral' : 'text-warn-solid'} aria-hidden />
                    {doc.name}
                  </span>
                  <span className={`text-sm font-semibold ${left < 0 ? 'text-coral' : left <= 30 ? 'text-plum-ink' : 'text-plum-muted'}`}>
                    {left < 0 ? `Expired ${formatDate(doc.expiryDate!)}` : `Expires ${formatDate(doc.expiryDate!)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter documents">
          {(
            [
              { id: 'all', label: 'All', count: mockDocuments.length },
              { id: 'action', label: 'Needs action', count: mockDocuments.filter(needsAction).length },
              { id: 'ready', label: 'Ready', count: mockDocuments.filter((d) => d.status === 'ready').length },
              { id: 'optional', label: 'Optional', count: mockDocuments.filter((d) => d.isOptional).length },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`focus-ring min-h-[44px] rounded-pill px-4 text-sm font-medium transition-colors ${
                filter === f.id ? 'bg-plum text-white' : 'bg-white/70 text-plum border border-plum/15 hover:border-plum'
              }`}
            >
              {f.label} <span className="opacity-75 tabular-nums">({f.count})</span>
            </button>
          ))}
        </div>
        <label className="relative block md:w-72">
          <span className="sr-only">Search documents</span>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-plum-muted" aria-hidden />
          <input
            type="search"
            placeholder="Search documents"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-10"
          />
        </label>
      </div>

      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => {
          const { icon: Icon } = CATEGORY[doc.category];
          const label = /agpo/i.test(doc.name) ? 'AGPO' : CATEGORY[doc.category].label;
          const expired = doc.expiryDate ? daysUntil(doc.expiryDate) < 0 : false;
          return (
            <li key={doc.id} className={`card p-5 flex flex-col ${needsAction(doc) ? 'border-coral/50' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="w-11 h-11 rounded-xl bg-blush flex items-center justify-center flex-shrink-0">
                  <Icon size={22} className="text-plum" aria-hidden />
                </span>
                <StatusChip status={doc.status} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-plum-muted">{label}</p>
              <h3 className="font-semibold text-plum-ink mb-3">{doc.name}</h3>
              <dl className="text-sm text-plum-muted space-y-0.5 mb-4">
                {doc.issueDate && (
                  <div className="flex gap-1">
                    <dt>Issued</dt>
                    <dd>{formatDate(doc.issueDate)}</dd>
                  </div>
                )}
                {doc.expiryDate && (
                  <div className={`flex gap-1 ${expired ? 'text-coral font-semibold' : ''}`}>
                    <dt>{expired ? 'Expired' : 'Expires'}</dt>
                    <dd>{formatDate(doc.expiryDate)}</dd>
                  </div>
                )}
                <div className="flex gap-1">
                  <dt className="sr-only">Required by</dt>
                  <dd>
                    Needed for {doc.requiredByCount} tender{doc.requiredByCount !== 1 ? 's' : ''}
                  </dd>
                </div>
              </dl>
              <div className="flex gap-2 mt-auto">
                {doc.status === 'ready' ? (
                  <Button variant="outlined" size="sm" className="flex-1" onClick={() => pickFile(doc)}>
                    Replace
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" className="flex-1" onClick={() => pickFile(doc)}>
                    {doc.status === 'missing' ? 'Upload' : 'Renew'}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {filteredDocs.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-plum-muted">No documents match{query ? ` "${query}"` : ' this filter'}.</p>
        </Card>
      )}
    </div>
  );
}
