import React, { useState } from 'react';
import { Card, Button, StatusChip, MatchRing } from '../components/ui';
import { mockTenders } from '../data/mock';
import { ChevronRight, Sparkles } from 'lucide-react';

export function Tenders() {
  const [filter, setFilter] = useState('all');
  const [question, setQuestion] = useState('');

  const questions = [
    'What documents do I need for this bid?',
    'How do I register on the tender portal?',
    'What is the payment timeline for winning bidders?',
  ];

  const filteredTenders = mockTenders.filter((t) => {
    if (filter === 'eligible') return t.status === 'ready';
    if (filter === 'closing') return new Date(t.closingDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return true;
  });

  return (
    <main className="flex-1 max-w-7xl mx-auto px-6 py-8">
      {/* Page Intro */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-8">
        <div>
          <h1 className="h1 text-plum">Tenders</h1>
          <p className="text-intro text-plum-soft">Ranked for your business, with the reasons why.</p>
        </div>
        <Card className="bg-white p-4 flex items-center gap-4">
          <div className="flex items-center gap-2 text-coral">
            <span className="w-2 h-2 rounded-full bg-coral animate-pulsering"></span>
            <span className="text-sm font-semibold">67% ready</span>
          </div>
          <span className="text-plum-muted text-sm">2 documents to fix</span>
          <Button variant="secondary" size="sm">Fix now</Button>
        </Card>
      </div>

      {/* Assistant Card */}
      <Card className="bg-gradient-to-br from-blush to-lilac-light p-6 mb-8">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-lg bg-white/50 flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-plum" />
          </div>
          <div className="flex-1">
            <h3 className="h2 text-plum mb-3">Ask about your matches</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuestion(q)}
                  className="bg-white/70 hover:bg-white rounded-pill px-3 py-2 text-xs font-medium text-plum transition"
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or type your question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1 input"
              />
              <Button variant="primary">Ask</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'all', label: 'All' },
          { id: 'eligible', label: 'Eligible' },
          { id: 'closing', label: 'Closing soon' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-pill px-4 py-2 text-sm font-medium transition ${
              filter === f.id ? 'bg-plum text-white' : 'bg-white/65 text-plum hover:bg-white/85'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tenders List */}
      <div className="space-y-3">
        {filteredTenders.map((tender, index) => (
          <div
            key={tender.id}
            className={`card p-4 flex items-center justify-between gap-4 ${
              tender.topPick ? 'border-2 border-plum bg-blush/30' : ''
            } ${tender.status === 'notEligible' ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {/* Rank */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                  index === 0
                    ? 'bg-plum text-white'
                    : index < 3
                    ? 'bg-blush text-plum'
                    : 'bg-gray-200 text-plum-muted'
                }`}
              >
                #{index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-plum truncate">{tender.title}</h3>
                  {tender.topPick && (
                    <span className="bg-coral text-white text-xs font-bold px-2 py-1 rounded-pill flex-shrink-0">
                      Top pick
                    </span>
                  )}
                </div>
                <p className="text-xs text-plum-muted truncate">
                  {tender.entity}, closes {new Date(tender.closingDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Match Ring */}
            <div className="flex-shrink-0">
              <MatchRing score={tender.matchScore} />
            </div>

            {/* Status Chip */}
            <div className="flex-shrink-0">
              <StatusChip status={tender.status} />
            </div>

            {/* Arrow */}
            <ChevronRight size={20} className="text-plum-muted flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Help Text */}
      <p className="text-xs text-plum-muted text-center mt-6">
        Your match score combines sector fit, location, AGPO eligibility and document readiness.
      </p>
    </main>
  );
}
