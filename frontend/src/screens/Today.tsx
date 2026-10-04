import React, { useState } from 'react';
import { Card, Button, StatusChip, MatchRing, CountdownRing, Badge, ProgressBar } from '../components/ui';
import { mockTenders, mockAlerts } from '../data/mock';
import { Clock, AlertCircle } from 'lucide-react';

export function Today() {
  const [showUnlock, setShowUnlock] = useState(false);
  const topTender = mockTenders[0];
  const eligibleCount = mockTenders.filter(t => t.status === 'ready').length;
  const totalTenders = mockTenders.length;

  const recentAlerts = mockAlerts.slice(0, 4);

  return (
    <main className="flex-1 max-w-7xl mx-auto px-6 py-8">
      {/* Greeting Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-8">
        <div>
          <h1 className="h1 text-plum">Welcome in, Sharon</h1>
          <p className="text-plum-soft text-intro mt-2">Ready to bid? Here's your snapshot.</p>
        </div>
        <div className="flex gap-12">
          <div className="text-center">
            <div className="text-big font-light text-plum">{eligibleCount}</div>
            <p className="text-xs text-plum-muted">tenders you qualify for</p>
          </div>
          <div className="text-center">
            <div className="text-big font-light text-plum">75%</div>
            <p className="text-xs text-plum-muted">ready to bid</p>
          </div>
          <div className="text-center">
            <div className="text-big font-light text-plum">16</div>
            <p className="text-xs text-plum-muted">days to deadline</p>
          </div>
        </div>
      </div>

      {/* Next Step Bar */}
      <Card className="bg-plum text-white mb-8 p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-coral animate-pulsering"></div>
          <span className="font-semibold">Next step: Upload your CR12. It unlocks 4 more tenders.</span>
        </div>
        <Button variant="secondary" onClick={() => setShowUnlock(true)}>
          Upload CR12
        </Button>
        {showUnlock && (
          <Badge className="absolute -top-8 -right-4">
            <span className="text-coral mr-2">+</span>4 tenders unlocked
          </Badge>
        )}
      </Card>

      {/* Three Column Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Owner Card */}
        <Card className="lg:col-span-1 p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-lilac rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">👩</span>
          </div>
          <h3 className="h2 mb-2">Sharon Kariuki</h3>
          <p className="text-plum-muted text-sm mb-4">Tech Solutions Ltd</p>
          <StatusChip status="ready" />
          <p className="text-xs text-plum-muted mt-2">AGPO women ✓</p>
        </Card>

        {/* Top Match Card */}
        <Card hero className="lg:col-span-1 p-8 relative overflow-hidden" >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-sheen"></div>
          <div className="relative z-10">
            <span className="inline-block bg-white/20 rounded-pill px-3 py-1 text-xs font-bold mb-4">Your top match</span>
            <h3 className="text-hero font-medium mb-2">{topTender.title}</h3>
            <p className="text-sm opacity-90 mb-4">{topTender.entity}, {topTender.reference}</p>
            <div className="mb-6">
              <MatchRing score={topTender.matchScore} size="lg" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/20 rounded-tile p-3 text-sm">
                <p className="text-xs opacity-75">Estimated value</p>
                <p className="font-semibold">{topTender.value}</p>
              </div>
              <div className="bg-white/20 rounded-tile p-3 text-sm">
                <p className="text-xs opacity-75">Closes</p>
                <p className="font-semibold">Oct 20</p>
              </div>
              <div className="bg-white/20 rounded-tile p-3 text-sm">
                <p className="text-xs opacity-75">Reserved for</p>
                <p className="font-semibold text-xs">{topTender.reservedFor}</p>
              </div>
              <div className="bg-white/20 rounded-tile p-3 text-sm">
                <p className="text-xs opacity-75">Your bid</p>
                <p className="font-semibold">{topTender.bidProgress}%</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              <span className="bg-white/20 rounded-pill px-3 py-1 text-xs">Sector match</span>
              <span className="bg-white/20 rounded-pill px-3 py-1 text-xs">Location eligible</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs opacity-75 mb-1">Closing in</p>
              <CountdownRing daysRemaining={16} deadline="2026-10-20T10:00" />
            </div>
            <Button variant="secondary">View tender</Button>
          </div>
        </Card>

        {/* Recent Alerts */}
        <Card className="lg:col-span-1 p-6">
          <h3 className="h2 mb-4">Recent alerts</h3>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-tile flex gap-3 ${alert.isRead ? 'bg-white/50' : 'bg-white border-l-4 border-coral'}`}
              >
                <div className="w-6 h-6 rounded-lg bg-coral/20 flex items-center justify-center flex-shrink-0">
                  {alert.type === 'scamWarning' && <AlertCircle size={16} className="text-coral" />}
                  {alert.type === 'newMatch' && <span className="text-sm">⭐</span>}
                  {alert.type === 'expiringDoc' && <Clock size={16} className="text-warn-solid" />}
                  {alert.type === 'briefing' && <span className="text-sm">📢</span>}
                </div>
                <div>
                  <p className="text-sm font-semibold text-plum-ink">{alert.title}</p>
                  <p className="text-xs text-plum-muted">{alert.description}</p>
                </div>
                {!alert.isRead && <div className="w-2 h-2 rounded-full bg-coral flex-shrink-0 mt-1"></div>}
              </div>
            ))}
          </div>
          <Button variant="outlined" className="w-full mt-4">Mark all read</Button>
        </Card>
      </div>

      {/* Week Calendar & Checklist */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="h2">This week</h3>
            <div className="flex gap-2">
              <Button variant="outlined" size="sm">←</Button>
              <Button variant="outlined" size="sm">→</Button>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={day} className="text-center text-xs text-plum-muted pb-4 border-b border-line">
                {day}
              </div>
            ))}
          </div>
          <div className="space-y-4 mt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-sm">
                <p className="text-xs text-plum-muted">8:00 am</p>
                <div className="bg-coral/20 rounded-tile p-2 mt-1 text-xs text-coral font-semibold">
                  Briefing session
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Checklist */}
        <Card className="bg-plum text-white p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="h2 text-white">Stationery bid</h3>
              <p className="text-sm opacity-90">1 of 5 steps done</p>
            </div>
            <span className="text-2xl">20%</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Register on portal', done: true },
              { label: 'Upload CR12', done: false },
              { label: 'Upload tax compliance', done: false },
              { label: 'Submit bid documents', done: false },
              { label: 'Review and submit', done: false },
            ].map((step, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <div className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${step.done ? 'bg-white' : ''}`}>
                  {step.done && <span className="text-plum font-bold">✓</span>}
                </div>
                <span className="text-sm">{step.label}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
