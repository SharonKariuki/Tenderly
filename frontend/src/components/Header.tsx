import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const location = useLocation();
  const isMapPage = location.pathname === '/map';

  const navItems = [
    { path: '/', label: 'Today' },
    { path: '/tenders', label: 'Tenders' },
    { path: '/check', label: 'Check a tender' },
    { path: '/documents', label: 'Documents' },
    { path: '/map', label: 'Map' },
  ];

  return (
    <header
      className={`${
        isMapPage ? 'bg-transparent' : 'bg-white/40 backdrop-blur-md border-b border-white/30'
      } sticky top-0 z-50 transition-all duration-300`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-bold bg-gradient-to-r from-plum to-coral text-white hover:shadow-lg transition-all duration-300"
        >
          <span className="text-lg">✦</span> tenderready
        </Link>

        {/* Navigation */}
        <nav
          className={`${
            isMapPage ? 'bg-white/5 backdrop-blur-md' : 'bg-white/60 backdrop-blur-md'
          } rounded-full flex gap-0.5 p-1.5 border border-white/20`}
        >
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${
                location.pathname === item.path
                  ? 'bg-gradient-to-r from-plum to-coral text-white shadow-md'
                  : isMapPage
                  ? 'text-white/80 hover:text-white hover:bg-white/10'
                  : 'text-plum-ink hover:bg-white/50'
              } rounded-full px-5 py-2 text-sm font-medium transition-all duration-300`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-coral to-plum border-2 border-white shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300">
          <div className="text-white font-bold text-lg">SK</div>
        </div>
      </div>
    </header>
  );
}
