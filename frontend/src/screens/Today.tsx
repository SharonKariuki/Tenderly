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
    <main className="flex-1 max-w-7xl mx-auto px-6 py-12">
      {/* Greeting Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12 mb-12">
        <div className="flex-1">
          <h1 className="h1 mb-3">Welcome in, Sharon</h1>
          <p className="text-lg text-plum-soft">Ready to bid? Here's your snapshot.</p>
        </div>
        <div className="flex gap-16 lg:gap-12 w-full lg:w-auto lg:justify-end">
          <div className="text-center flex-1 lg:flex-none">
            <div className="text-5xl lg:text-6xl font-light bg-gradient-to-r from-coral to-plum bg-clip-text text-transparent mb-2">{eligibleCount}</div>
            <p className="text-sm text-plum-muted">tenders you<br/>qualify for</p>
          </div>
          <div className="text-center flex-1 lg:flex-none">
            <div className="text-5xl lg:text-6xl font-light bg-gradient-to-r from-plum via-coral to-plum bg-clip-text text-transparent mb-2">75%</div>
            <p className="text-sm text-plum-muted">ready to<br/>bid</p>
          </div>
          <div className="text-center flex-1 lg:flex-none">
            <div className="text-5xl lg:text-6xl font-light bg-gradient-to-r from-plum to-coral bg-clip-text text-transparent mb-2">16</div>
            <p className="text-sm text-plum-muted">days to<br/>deadline</p>
          </div>
        </div>
      </div>

      {/* Next Step Bar */}
      <Card className="bg-gradient-to-r from-plum via-plum-deep to-plum-deep text-white mb-12 p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-coral/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="flex items-center gap-4 relative z-10 flex-1">
          <div className="w-3 h-3 rounded-full bg-coral animate-pulsering flex-shrink-0"></div>
          <div>
            <span className="font-semibold text-lg block">Next step: Upload your CR12</span>
            <span className="text-sm opacity-90">Unlocks 4 more matching tenders</span>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setShowUnlock(true)} className="relative z-10 flex-shrink-0">
          Upload CR12
        </Button>
        {showUnlock && (
          <Badge className="absolute -top-4 right-8 z-20">
            <span className="text-coral mr-2">+</span>4 tenders unlocked
          </Badge>
        )}
      </Card>

      {/* Three Column Row */}
      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        {/* Owner Card */}
        <Card className="lg:col-span-1 p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-coral to-plum rounded-full flex items-center justify-center mb-6 shadow-lg">
            <span className="text-4xl">👩</span>
          </div>
          <h3 className="h2 mb-2">Sharon Kariuki</h3>
          <p className="text-plum-muted text-sm mb-6">Tech Solutions Ltd</p>
          <StatusChip status="ready" />
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-ok-bg/50 rounded-full">
            <span className="text-lg">✓</span>
            <p className="text-xs text-ok-text font-medium">AGPO women certified</p>
          </div>
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
        <Card className="lg:col-span-1 p-8">
          <h3 className="h2 mb-6">Recent alerts</h3>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl flex gap-4 transition-all ${alert.isRead ? 'bg-gray-50/50' : 'bg-gradient-to-r from-coral/10 to-coral/5 border-l-4 border-coral'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${alert.isRead ? 'bg-gray-200/50' : 'bg-coral/20'}`}>
                  {alert.type === 'scamWarning' && <AlertCircle size={18} className="text-coral" />}
                  {alert.type === 'newMatch' && <span className="text-base">⭐</span>}
                  {alert.type === 'expiringDoc' && <Clock size={18} className="text-warn-solid" />}
                  {alert.type === 'briefing' && <span className="text-base">📢</span>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${alert.isRead ? 'text-plum-muted' : 'text-plum-ink'}`}>{alert.title}</p>
                  <p className="text-xs text-plum-muted">{alert.description}</p>
                </div>
                {!alert.isRead && <div className="w-2 h-2 rounded-full bg-coral flex-shrink-0 mt-2 animate-pulse"></div>}
              </div>
            ))}
          </div>
          <Button variant="outlined" className="w-full mt-6">Mark all read</Button>
        </Card>
      </div>

      {/* Week Calendar & Checklist */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Calendar */}
        <Card className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="h2">This week</h3>
            <div className="flex gap-2">
              <Button variant="outlined" size="sm">←</Button>
              <Button variant="outlined" size="sm">→</Button>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={day} className="text-center text-xs font-medium text-plum-muted pb-4 border-b border-line">
                {day}
              </div>
            ))}
          </div>
          <div className="space-y-4 mt-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-sm group cursor-pointer">
                <p className="text-xs text-plum-muted font-medium mb-2">8:00 am</p>
                <div className="bg-gradient-to-r from-coral/20 to-coral/10 rounded-lg p-3 text-xs text-coral font-semibold group-hover:shadow-md group-hover:from-coral/30 transition-all">
                  📋 Briefing session
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Checklist */}
        <Card className="bg-gradient-to-br from-plum via-plum-deep to-plum-deep text-white p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="h2 text-white">Stationery bid</h3>
              <p className="text-sm opacity-90 mt-1">1 of 5 steps done</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-light">20%</div>
              <p className="text-xs opacity-75 mt-1">Complete</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Register on portal', done: true },
              { label: 'Upload CR12', done: false },
              { label: 'Upload tax compliance', done: false },
              { label: 'Submit bid documents', done: false },
              { label: 'Review and submit', done: false },
            ].map((step, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-6 h-6 rounded-full border-2 border-white/50 flex items-center justify-center flex-shrink-0 transition-all ${step.done ? 'bg-white border-white' : 'group-hover:border-white'}`}>
                  {step.done && <span className="text-plum font-bold">✓</span>}
                </div>
                <span className={`text-sm transition-all ${step.done ? 'opacity-60 line-through' : 'opacity-100'}`}>{step.label}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
