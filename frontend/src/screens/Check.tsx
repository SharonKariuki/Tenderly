import React, { useState } from 'react';
import { Card, Button, StatusChip, ProgressBar } from '../components/ui';
import { Upload, AlertCircle, CheckCircle, Shield, XCircle } from 'lucide-react';

export function Check() {
  const [uploadMode, setUploadMode] = useState<'upload' | 'demo' | 'suspicious' | 'results'>('upload');
  const [checking, setChecking] = useState(false);
  const [checkStep, setCheckStep] = useState<number | null>(null);

  const steps = [
    { id: 1, label: 'Extract tender text' },
    { id: 2, label: 'Check for fraud signals' },
    { id: 3, label: 'Verify your eligibility' },
  ];

  const handleDemo = (type: 'genuine' | 'suspicious') => {
    setChecking(true);
    setCheckStep(1);
    let step = 1;
    const interval = setInterval(() => {
      step++;
      setCheckStep(step);
      if (step > 3) {
        clearInterval(interval);
        setChecking(false);
        setUploadMode(type === 'genuine' ? 'results' : 'results');
      }
    }, 1500);
  };

  if (uploadMode === 'results') {
    const isGenuine = uploadMode === 'results';
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 pb-20">
        {/* Results Card */}
        <Card
          className={`p-10 mb-10 relative overflow-hidden ${isGenuine ? 'card-hero' : 'card-scam'}`}
        >
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl" style={{background: 'radial-gradient(circle, white, transparent)'}}></div>
          </div>
          <div className="flex items-start gap-6 mb-8 relative z-10">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${isGenuine ? 'bg-white/20' : 'bg-white/10'}`}>
              {isGenuine ? (
                <Shield size={32} className="text-white" />
              ) : (
                <AlertCircle size={32} className="text-white" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-4xl font-semibold text-white mb-2">
                {isGenuine ? '✓ Tender looks genuine' : '⚠️ Suspicious tender'}
              </h2>
              <p className="text-lg text-white/85">
                {isGenuine
                  ? 'Source: Official portal • Nairobi City County • Oct 20, 2026'
                  : 'Source: Email • Unverified sender • Requests upfront fee'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-white relative z-10">
            <div>
              <p className="text-sm opacity-75 mb-2">Estimated value</p>
              <p className="text-2xl font-light">KES 500K - 1M</p>
            </div>
            <div>
              <p className="text-sm opacity-75 mb-2">Your bid progress</p>
              <p className="text-2xl font-light">20%</p>
            </div>
          </div>
        </Card>

        {/* Actions Row */}
        <div className="flex gap-4 mb-10 flex-wrap">
          {isGenuine ? (
            <>
              <Button variant="primary" size="lg">Save to my tenders</Button>
              <Button variant="outlined" size="lg">Check another</Button>
            </>
          ) : (
            <>
              <Button variant="coral" size="lg">Report suspected fraud</Button>
              <Button variant="outlined" size="lg">Check another</Button>
            </>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          {/* Fraud Signals */}
          <Card className="p-8">
            <h3 className="h2 mb-6">Is it genuine?</h3>
            <div className="space-y-3">
              {[
                {
                  label: 'Listed on official portal',
                  status: isGenuine ? 'ok' : 'flag',
                  detail: isGenuine
                    ? 'Found on procurement.go.ke'
                    : 'Not found on official portal',
                },
                {
                  label: 'Official contact domain',
                  status: isGenuine ? 'ok' : 'flag',
                  detail: isGenuine
                    ? 'Contacts use .go.ke addresses'
                    : 'Contact is personal email',
                },
                {
                  label: 'No fee to a person',
                  status: isGenuine ? 'ok' : 'flag',
                  detail: isGenuine
                    ? 'No personal fees mentioned'
                    : 'Requests KES 5,000 to confirm bid',
                },
                {
                  label: 'Bid security to institution',
                  status: isGenuine ? 'ok' : 'flag',
                  detail: isGenuine
                    ? 'Bond payable to county'
                    : 'Bond payable to personal M-Pesa',
                },
                {
                  label: 'Reasonable timeline',
                  status: isGenuine ? 'ok' : 'ok',
                  detail: isGenuine ? '16 days to deadline' : '16 days to deadline',
                },
              ].map((signal, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg transition-all ${
                    signal.status === 'ok'
                      ? 'bg-gradient-to-r from-ok-bg/40 to-ok-bg/20'
                      : 'bg-gradient-to-r from-coral/15 to-coral/5'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    {signal.status === 'ok' ? (
                      <div className="w-6 h-6 rounded-full bg-ok-solid/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle size={16} className="text-ok-solid" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-coral/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <XCircle size={16} className="text-coral" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-plum-ink">{signal.label}</p>
                      <p className="text-xs text-plum-muted mt-1">{signal.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Eligibility */}
          <Card className={`p-6 ${isGenuine ? '' : 'opacity-50'}`}>
            <h3 className="h2 mb-4">Do you qualify?</h3>
            <div className="mb-6">
              <p className="text-4xl font-light text-plum">4</p>
              <p className="text-plum-muted text-sm">of 6 requirements met</p>
              <div className="mt-3">
                <ProgressBar value={4} max={6} />
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Tax Compliance Certificate', status: 'ready' },
                { label: 'Business Registration', status: 'ready' },
                { label: 'CRB Report', status: 'ready' },
                { label: 'TIN Certificate', status: 'ready' },
                { label: 'Insurance Certificate', status: 'missing' },
                { label: 'Bank Reference', status: 'missing' },
              ].map((req, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  {req.status === 'ready' ? (
                    <CheckCircle size={16} className="text-ok-solid flex-shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-coral flex-shrink-0" />
                  )}
                  <span className="text-sm text-plum-ink">{req.label}</span>
                  {req.status === 'missing' && (
                    <Button variant="secondary" size="sm" className="ml-auto">
                      Upload
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* How It Works */}
        <div className="mb-8">
          <h3 className="h2 mb-4">How we check</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step) => (
              <Card key={step.id} className="p-4 text-center">
                <div className="w-8 h-8 rounded-full bg-ok-bg text-ok-solid font-bold mx-auto mb-2">
                  ✓
                </div>
                <p className="text-sm font-semibold text-plum">{step.label}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <Card className="bg-lilac/20 border-2 border-lilac p-4 text-center">
          <p className="text-xs text-plum-ink">
            <strong>Guidance only.</strong> This check is not an official decision. Always confirm on{' '}
            <a href="#" className="text-plum font-semibold hover:underline">
              the official portal
            </a>{' '}
            before submitting your bid.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-20">
      {/* Page Intro */}
      <div>
        <h1 className="h1 mb-2">Check a tender</h1>
        <p className="text-lg text-plum-soft mb-8">
          Before you spend time and money, check if you qualify and if it's real.
        </p>
      </div>

      {/* Upload Card */}
      <Card className="p-8 mb-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blush rounded-full flex items-center justify-center mx-auto mb-4 animate-floaty">
            <Upload size={32} className="text-plum" />
          </div>
          <h2 className="h2 mb-2">Drag and drop your tender PDF here</h2>
          <p className="text-plum-muted text-sm">Or browse files from your device</p>
        </div>

        <div className="border-2 border-dashed border-line rounded-card p-8 text-center mb-6 hover:border-plum transition cursor-pointer">
          <p className="text-plum-muted">📄 Drop PDF here</p>
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="primary">Browse files</Button>
          <Button variant="outlined">Use demo tender</Button>
          <Button variant="coral" onClick={() => handleDemo('suspicious')}>
            Try a suspicious one
          </Button>
        </div>
      </Card>

      {/* Text Input Option */}
      <Card className="p-6 mb-8">
        <h3 className="h2 mb-4">Got it on WhatsApp or by email?</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Paste the tender details or link here..."
            className="input flex-1"
          />
          <Button variant="coral">Check it</Button>
        </div>
      </Card>

      {/* Checking State */}
      {checking && (
        <Card className="p-8 text-center">
          <div className="mb-6">
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full" viewBox="0 0 120 120">
                <rect
                  x="10"
                  y="10"
                  width="100"
                  height="100"
                  fill="#FFFAF9"
                  rx="8"
                  opacity="0.3"
                />
                <rect
                  x="10"
                  y="10"
                  width={(checkStep || 0) * 33.33}
                  height="100"
                  fill="#E5484D"
                  rx="8"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">{checkStep}/3</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`p-3 rounded-tile text-left transition ${
                  checkStep === step.id
                    ? 'bg-plum text-white'
                    : checkStep && checkStep > step.id
                    ? 'bg-ok-bg text-plum-ink'
                    : 'bg-gray-100 text-plum-muted'
                }`}
              >
                {step.label}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
