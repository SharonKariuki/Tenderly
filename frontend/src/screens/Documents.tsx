import React, { useState } from 'react';
import { Card, Button, StatusChip, ProgressBar } from '../components/ui';
import { mockDocuments } from '../data/mock';
import { Calendar, Upload, AlertCircle } from 'lucide-react';

export function Documents() {
  const [filter, setFilter] = useState('all');

  const readyCount = mockDocuments.filter((d) => d.status === 'ready').length;
  const needsActionCount = mockDocuments.filter((d) => d.status === 'actionNeeded').length;

  const filteredDocs = mockDocuments.filter((d) => {
    if (filter === 'ready') return d.status === 'ready';
    if (filter === 'action') return d.status === 'actionNeeded';
    if (filter === 'optional') return d.isOptional;
    return true;
  });

  const docIcons: { [key: string]: string } = {
    crb: '📊',
    taxCompliance: '✓',
    tin: '🏛️',
    businessRegistration: '📋',
    insurance: '🛡️',
    bank: '🏦',
    other: '📄',
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 pb-20">
      {/* Page Intro */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
        <div>
          <h1 className="h1 mb-3">Documents</h1>
          <p className="text-lg text-plum-soft">Keep your paperwork ready, and opportunities unlock.</p>
        </div>
        <Button variant="primary" size="lg">+ Add document</Button>
      </div>

      {/* Health Card & Coming Up Row */}
      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        {/* Document Health */}
        <Card className="card-hero p-10 lg:col-span-1 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full blur-3xl" style={{background: 'radial-gradient(circle, white, transparent)'}}></div>
          </div>
          <div className="relative z-10">
            <h3 className="h2 text-white mb-6">Document health</h3>
            <p className="text-5xl font-light text-white mb-2">{readyCount}</p>
            <p className="text-base opacity-90 mb-8">of 7 required ready</p>
            <div>
              <ProgressBar value={readyCount} max={7} />
            </div>
          </div>
        </Card>

        {/* Coming Up */}
        <Card className="p-10 lg:col-span-2">
          <h3 className="h2 mb-6">Expiring soon</h3>
          <div className="space-y-3">
            {mockDocuments
              .filter((d) => d.expiryDate)
              .sort((a, b) => new Date(a.expiryDate || '').getTime() - new Date(b.expiryDate || '').getTime())
              .slice(0, 3)
              .map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-warn-bg/40 to-warn-bg/20 rounded-lg border border-warn-bg hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-warn-solid/20 flex items-center justify-center flex-shrink-0">
                      <Calendar size={18} className="text-warn-solid" />
                    </div>
                    <span className="font-semibold text-sm text-plum-ink">{doc.name}</span>
                  </div>
                  <span className="text-xs text-plum-ink font-semibold">
                    Expires {new Date(doc.expiryDate || '').toLocaleDateString()}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {[
          { id: 'all', label: 'All', count: mockDocuments.length },
          { id: 'action', label: 'Needs action', count: needsActionCount },
          { id: 'ready', label: 'Ready', count: readyCount },
          { id: 'optional', label: 'Optional', count: mockDocuments.filter((d) => d.isOptional).length },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
              filter === f.id
                ? 'bg-plum text-white shadow-lg'
                : 'bg-white/60 text-plum hover:bg-white/80 border border-white/40'
            }`}
          >
            {f.label} {f.count > 0 && <span className="ml-2 opacity-75">({f.count})</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-8">
        <input type="text" placeholder="Search documents..." className="input max-w-md" />
      </div>

      {/* Documents Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredDocs.map((doc) => (
          <Card
            key={doc.id}
            className={`overflow-hidden flex flex-col transition-all group ${
              doc.status === 'missing' ? 'ring-2 ring-coral/50 ring-offset-2' : ''
            } ${doc.displayStatus === 'expiring' ? 'ring-2 ring-warn-solid/50 ring-offset-2' : ''}`}
          >
            {/* Header */}
            <div
              className="p-8 bg-plum text-white relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-10">
                <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full blur-2xl" style={{background: 'radial-gradient(circle, white, transparent)'}}></div>
              </div>
              <div className="relative z-10">
                <div className="text-5xl mb-4">{docIcons[doc.category]}</div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-bold bg-white/20 rounded-full px-3 py-1">
                    {doc.category.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <StatusChip status={doc.status} />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="font-semibold text-plum mb-4">{doc.name}</h3>

              {/* Dates */}
              {doc.issueDate && (
                <div className="text-xs text-plum-muted mb-3">
                  <p>Issued: {new Date(doc.issueDate).toLocaleDateString()}</p>
                  {doc.expiryDate && <p>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</p>}
                </div>
              )}

              {/* Required By */}
              <div className="flex items-center gap-2 text-xs text-plum-muted mb-4">
                <AlertCircle size={14} />
                <span>Required by {doc.requiredByCount} tender{doc.requiredByCount !== 1 ? 's' : ''}</span>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 mt-auto">
                {doc.status === 'ready' ? (
                  <>
                    <Button variant="secondary" size="sm" className="flex-1">
                      View
                    </Button>
                    <Button variant="outlined" size="sm" className="flex-1">
                      Replace
                    </Button>
                  </>
                ) : (
                  <>
                    {doc.status === 'actionNeeded' && (
                      <Button variant="coral" size="sm" className="flex-1">
                        Renew
                      </Button>
                    )}
                    {doc.status === 'missing' && (
                      <Button variant="primary" size="sm" className="flex-1">
                        Upload
                      </Button>
                    )}
                    <Button variant="outlined" size="sm" className="flex-1">
                      {doc.status === 'actionNeeded' ? 'Skip' : 'Skip'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredDocs.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-plum-muted">No documents to show</p>
        </Card>
      )}
    </div>
  );
}
