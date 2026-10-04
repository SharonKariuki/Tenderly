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
    <main className="flex-1 max-w-7xl mx-auto px-6 py-12">
      {/* Page Intro */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
        <div>
          <h1 className="h1 mb-3">Tenders</h1>
          <p className="text-lg text-plum-soft">Ranked for your business, with the reasons why.</p>
        </div>
        <Card className="bg-gradient-to-r from-white/60 to-white/40 p-4 flex flex-col lg:flex-row items-start lg:items-center gap-4 border border-white/30">
          <div className="flex items-center gap-2 text-coral font-medium">
            <span className="w-2 h-2 rounded-full bg-coral animate-pulsering"></span>
            <span className="text-sm font-semibold">67% ready</span>
          </div>
          <div className="hidden lg:block w-px h-4 bg-plum/10"></div>
          <span className="text-plum-muted text-sm">2 documents to fix</span>
          <Button variant="secondary" size="sm">Fix now</Button>
        </Card>
      </div>

      {/* Assistant Card */}
      <Card className="bg-gradient-to-br from-lilac/20 via-blush/20 to-coral/10 p-8 mb-12 border border-lilac/30">
        <div className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-plum to-coral flex items-center justify-center flex-shrink-0 shadow-md">
            <Sparkles size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="h2 text-plum mb-4">Ask about your matches</h3>
            <div className="flex flex-wrap gap-2 mb-5">
              {questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuestion(q)}
                  className="bg-white/80 hover:bg-white rounded-full px-4 py-2 text-xs font-medium text-plum transition-all hover:shadow-md"
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
      <div className="flex gap-3 mb-8">
        {[
          { id: 'all', label: 'All tenders' },
          { id: 'eligible', label: 'Eligible' },
          { id: 'closing', label: 'Closing soon' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
              filter === f.id
                ? 'bg-gradient-to-r from-plum to-coral text-white shadow-lg'
                : 'bg-white/60 text-plum hover:bg-white/80 border border-white/40'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tenders List */}
      <div className="space-y-4">
        {filteredTenders.map((tender, index) => (
          <div
            key={tender.id}
            className={`card p-6 flex items-center justify-between gap-6 group cursor-pointer ${
              tender.topPick ? 'border-2 border-coral ring-2 ring-coral/20 ring-offset-2' : ''
            } ${tender.status === 'notEligible' ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start gap-6 flex-1 min-w-0">
              {/* Rank Badge */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-md transition-all ${
                  index === 0
                    ? 'bg-gradient-to-br from-plum to-coral text-white'
                    : index < 3
                    ? 'bg-gradient-to-br from-blush to-lilac/30 text-plum'
                    : 'bg-gray-100 text-plum-muted'
                }`}
              >
                #{index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-plum-ink truncate group-hover:text-plum transition-colors">{tender.title}</h3>
                  {tender.topPick && (
                    <span className="bg-gradient-to-r from-coral to-coral-wine text-white text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 shadow-md">
                      ⭐ Top pick
                    </span>
                  )}
                </div>
                <p className="text-sm text-plum-muted truncate">
                  {tender.entity} • Closes {new Date(tender.closingDate).toLocaleDateString()}
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
            <ChevronRight size={22} className="text-plum-muted flex-shrink-0 group-hover:translate-x-1 transition-transform" />
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
