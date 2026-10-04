import { Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, CheckCircle, Files, Map, X } from 'lucide-react';
import { useApp } from '../context/AppState';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { profile } = useApp();

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
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-plum-deep via-plum-deep to-plum z-50 transition-all duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full invisible lg:visible lg:translate-x-0'
        }`}
      >
        {/* Close button for mobile */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="focus-ring absolute top-3 right-3 lg:hidden flex w-11 h-11 items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={20} aria-hidden />
        </button>

        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2 text-white">
            <span className="text-2xl" aria-hidden>✦</span>
            <div className="flex flex-col">
              <span className="font-bold text-base">tenderready</span>
              <span className="text-xs text-white/75">{profile.businessName}</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2" aria-label="Main">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={`focus-ring flex items-center gap-4 px-4 py-3 rounded-xl transition-colors group ${
                  active ? 'bg-white/15 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" aria-hidden />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{item.label}</div>
                  <div className={`text-xs ${active ? 'text-white/90' : 'text-white/70'}`}>
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
            <p className="text-xs text-white/75 mb-2">Quick tip</p>
            <p className="text-sm text-white/90 leading-relaxed">
              Upload your CR12 to unlock 4 more tenders
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
