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
        isMapPage ? 'bg-transparent' : 'bg-white/50 backdrop-blur'
      } sticky top-0 z-50 border-b border-line`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        {/* Logo */}
        <Link
          to="/"
          className="rounded-pill border-2 border-plum px-4 py-2 text-sm font-medium text-plum hover:bg-plum/5 transition"
        >
          tenderready
        </Link>

        {/* Navigation */}
        <nav
          className={`${
            isMapPage ? 'bg-white/10 backdrop-blur' : 'bg-white/65'
          } rounded-pill flex gap-1 p-1`}
        >
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${
                location.pathname === item.path
                  ? isMapPage
                    ? 'bg-blush text-plum'
                    : 'bg-plum text-white'
                  : 'text-plum-ink hover:bg-white/50'
              } rounded-pill px-4 py-2 text-sm font-medium transition-all`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-lilac border-4 border-white flex items-center justify-center">
          <div className="text-white font-bold text-lg">A</div>
        </div>
      </div>
    </header>
  );
}
