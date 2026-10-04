import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, CheckCircle, Files, Map, Menu, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      label: 'Today',
      icon: Calendar,
      description: 'Dashboard & snapshot',
    },
    {
      path: '/tenders',
      label: 'Tenders',
      icon: FileText,
      description: 'All tenders ranked',
    },
    {
      path: '/check',
      label: 'Check',
      icon: CheckCircle,
      description: 'Verify a tender',
    },
    {
      path: '/documents',
      label: 'Documents',
      icon: Files,
      description: 'Manage your docs',
    },
    {
      path: '/map',
      label: 'Map',
      icon: Map,
      description: 'Sectors & timeline',
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-plum-deep via-plum-deep to-plum z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:sticky lg:top-0 flex flex-col`}
      >
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 lg:hidden w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
        >
          <X size={20} />
        </button>

        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2 text-white">
            <span className="text-2xl">✦</span>
            <div className="flex flex-col">
              <span className="font-bold text-base">tenderready</span>
              <span className="text-xs opacity-70">Sharon's workspace</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  active
                    ? 'bg-gradient-to-r from-coral to-coral-wine text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon
                  size={20}
                  className={`flex-shrink-0 ${active ? 'text-white' : 'group-hover:translate-x-1'} transition-transform`}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{item.label}</div>
                  <div
                    className={`text-xs ${
                      active ? 'opacity-90' : 'opacity-60'
                    } group-hover:opacity-80 transition-opacity`}
                  >
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-xs text-white/60 mb-3">Quick tip</p>
            <p className="text-sm text-white/90 leading-relaxed">
              Upload your CR12 to unlock 4 more tenders
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
