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
    <main className="flex-1 max-w-7xl mx-auto px-6 py-8">
      {/* Page Intro */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-8">
        <div>
          <h1 className="h1 text-plum">Documents</h1>
          <p className="text-intro text-plum-soft">Keep your paperwork ready, and opportunities unlock.</p>
        </div>
        <Button variant="primary">+ Add document</Button>
      </div>

      {/* Health Card & Coming Up Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Document Health */}
        <Card className="card-hero p-8 lg:col-span-1">
          <h3 className="h2 text-white mb-4">Document health</h3>
          <p className="text-4xl font-light text-white mb-2">{readyCount}</p>
          <p className="text-sm opacity-90 mb-6">of 7 required ready</p>
          <div>
            <ProgressBar value={readyCount} max={7} />
          </div>
        </Card>

        {/* Coming Up */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="h2 mb-4">Coming up</h3>
          <div className="space-y-2">
            {mockDocuments
              .filter((d) => d.expiryDate)
              .sort((a, b) => new Date(a.expiryDate || '').getTime() - new Date(b.expiryDate || '').getTime())
              .slice(0, 3)
              .map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-warn-bg/50 rounded-tile">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-warn-text" />
                    <span className="font-semibold text-sm text-plum-ink">{doc.name}</span>
                  </div>
                  <span className="text-xs text-warn-text font-semibold">
                    Expires {new Date(doc.expiryDate || '').toLocaleDateString()}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'all', label: 'All', count: mockDocuments.length },
          { id: 'action', label: 'Needs action', count: needsActionCount },
          { id: 'ready', label: 'Ready', count: readyCount },
          { id: 'optional', label: 'Optional', count: mockDocuments.filter((d) => d.isOptional).length },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-pill px-4 py-2 text-sm font-medium transition ${
              filter === f.id ? 'bg-plum text-white' : 'bg-white/65 text-plum hover:bg-white/85'
            }`}
          >
            {f.label} {f.count > 0 && <span className="ml-2 opacity-75">({f.count})</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input type="text" placeholder="Search documents..." className="input max-w-md" />
      </div>

      {/* Documents Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map((doc) => (
          <Card
            key={doc.id}
            className={`overflow-hidden flex flex-col ${
              doc.status === 'missing' ? 'border-2 border-coral' : ''
            } ${doc.displayStatus === 'expiring' ? 'border-2 border-warn-solid' : ''}`}
          >
            {/* Header */}
            <div
              className={`p-6 text-white ${
                doc.status === 'ready' ? 'bg-ok-solid' : doc.status === 'actionNeeded' ? 'bg-warn-solid' : 'bg-coral'
              } relative`}
            >
              <div className="text-4xl mb-3">{docIcons[doc.category]}</div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs font-bold bg-white/20 rounded-pill px-3 py-1">
                  {doc.category.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <StatusChip status={doc.status} />
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
    </main>
  );
}
