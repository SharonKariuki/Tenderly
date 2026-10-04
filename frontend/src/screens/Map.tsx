import React, { useState } from 'react';
import { Card, Button } from '../components/ui';
import { ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';

export function Map() {
  const [closingWindow, setClosingWindow] = useState('all');
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const sectors = [
    { id: 'it', name: 'IT & Tech', match: 94, tenders: 12, color: '#C8B6E2' },
    { id: 'construction', name: 'Construction', match: 65, tenders: 8, color: '#C8B6E2' },
    { id: 'health', name: 'Healthcare', match: 55, tenders: 6, color: '#C8B6E2' },
    { id: 'education', name: 'Education', match: 78, tenders: 14, color: '#C8B6E2' },
    { id: 'cleaning', name: 'Cleaning', match: 88, tenders: 11, color: '#C8B6E2' },
    { id: 'energy', name: 'Energy', match: 45, tenders: 5, color: '#C8B6E2' },
    { id: 'agriculture', name: 'Agriculture', match: 62, tenders: 9, color: '#C8B6E2' },
    { id: 'transport', name: 'Transport', match: 72, tenders: 10, color: '#C8B6E2' },
  ];

  const closingOptions = [
    { id: 'week', label: 'This week', tenders: 3 },
    { id: 'month', label: 'This month', tenders: 12 },
    { id: 'quarter', label: 'This quarter', tenders: 28 },
    { id: 'all', label: 'All open', tenders: 67 },
  ];

  const sectorTenders = selectedSector
    ? [
        { id: 1, days: 5, title: 'Office supplies' },
        { id: 2, days: 8, title: 'Cleaning services' },
        { id: 3, days: 12, title: 'IT support' },
        { id: 4, days: 15, title: 'Furniture' },
      ]
    : [];

  return (
    <main className="flex-1 bg-[#140A18] relative overflow-hidden">
      {/* SVG Map */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background glows */}
        <defs>
          <radialGradient id="plumGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3D1F47" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3D1F47" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="coralGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E8505B" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#E8505B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Center glow */}
        <circle cx="600" cy="300" r="200" fill="url(#coralGlow)" />
        <circle cx="600" cy="300" r="150" fill="url(#plumGlow)" />

        {/* Center orb */}
        <circle cx="600" cy="300" r="40" fill="#E8505B" opacity="0.8" className="animate-orbit" />
        <circle cx="600" cy="300" r="60" fill="none" stroke="#E8505B" strokeWidth="2" opacity="0.4" />
        <circle
          cx="600"
          cy="300"
          r="80"
          fill="none"
          stroke="#E8505B"
          strokeWidth="2"
          opacity="0.2"
          className="animate-flow"
        />

        {/* Sector nodes */}
        {sectors.map((sector, i) => {
          const angle = (i / sectors.length) * Math.PI * 2 - Math.PI / 2;
          const distance = 200;
          const x = 600 + Math.cos(angle) * distance;
          const y = 300 + Math.sin(angle) * distance;

          return (
            <g key={sector.id}>
              {/* Connection line */}
              <line
                x1="600"
                y1="300"
                x2={x}
                y2={y}
                stroke="#E8505B"
                strokeWidth="2"
                opacity="0.3"
                className="animate-flow"
                strokeDasharray="10,5"
              />

              {/* Sector node */}
              <circle
                cx={x}
                cy={y}
                r="30"
                fill={sector.color}
                opacity="0.8"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedSector(selectedSector === sector.id ? null : sector.id)}
              >
                <title>{sector.name}</title>
              </circle>

              {/* Tender dots around sector */}
              {[...Array(Math.min(sector.tenders, 4))].map((_, dotI) => {
                const dotAngle = angle + (dotI / 4) * (Math.PI / 2);
                const dotDistance = 55;
                const dotX = x + Math.cos(dotAngle) * dotDistance;
                const dotY = y + Math.sin(dotAngle) * dotDistance;
                const days = 5 + dotI * 3;

                return (
                  <g key={`tender-${dotI}`}>
                    <circle cx={dotX} cy={dotY} r="6" fill={days > 10 ? '#C8B6E2' : '#E9A23B'} opacity="0.9" />
                    <text
                      x={dotX}
                      y={dotY - 12}
                      fontSize="10"
                      fill="#E8505B"
                      textAnchor="middle"
                      opacity="0.7"
                    >
                      {days}d
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Center label */}
        <text
          x="600"
          y="310"
          fontSize="14"
          fontWeight="600"
          fill="#F9D5DC"
          textAnchor="middle"
        >
          Your profile
        </text>
      </svg>

      {/* Left Panel - Closing Window */}
      <div className="absolute left-6 top-6 max-w-xs">
        <Card className="bg-white/10 backdrop-blur border border-white/20 p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            Closing within <ChevronDown size={16} />
          </h3>
          <div className="space-y-2">
            {closingOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setClosingWindow(opt.id)}
                className={`w-full text-left px-3 py-2 rounded-pill text-xs font-medium transition ${
                  closingWindow === opt.id
                    ? 'bg-coral text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {opt.label} <span className="opacity-60">({opt.tenders})</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Right Panel - Zoom Controls */}
      <div className="absolute right-6 top-6 flex flex-col gap-2">
        <button
          onClick={() => setZoom(Math.min(2, zoom + 0.2))}
          className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={() => setZoom(Math.max(0.5, zoom - 0.2))}
          className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition"
        >
          <ZoomOut size={20} />
        </button>
      </div>

      {/* Right Sidebar - Sector Details */}
      {selectedSector && (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/95 backdrop-blur p-6 border-l border-line overflow-y-auto">
          <h3 className="h2 mb-4">
            {sectors.find((s) => s.id === selectedSector)?.name}
          </h3>

          <div className="space-y-4 mb-6">
            <div>
              <p className="text-xs text-plum-muted">Match score</p>
              <p className="text-2xl font-light text-plum">
                {sectors.find((s) => s.id === selectedSector)?.match}%
              </p>
            </div>
            <div>
              <p className="text-xs text-plum-muted">Tenders available</p>
              <p className="text-2xl font-light text-plum">
                {sectors.find((s) => s.id === selectedSector)?.tenders}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-plum mb-3 text-sm">Latest tenders</h4>
            <div className="space-y-2">
              {sectorTenders.map((tender) => (
                <div key={tender.id} className="p-3 bg-blush/30 rounded-tile">
                  <p className="text-sm font-medium text-plum">{tender.title}</p>
                  <p className="text-xs text-plum-muted">{tender.days} days left</p>
                </div>
              ))}
            </div>
          </div>

          <Button variant="secondary" className="w-full">
            See these tenders
          </Button>
        </div>
      )}

      {/* Bottom Legend */}
      <div className="absolute bottom-6 left-6 right-6">
        <Card className="bg-white/10 backdrop-blur border border-white/20 p-4">
          <div className="grid grid-cols-3 gap-4 text-xs text-white">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Sector hubs</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Open tenders</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Deadline window</span>
            </label>
          </div>
          <p className="text-xs text-white/60 mt-3">💡 Tap a sector to see its tenders</p>
        </Card>
      </div>
    </main>
  );
}
