import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/40 backdrop-blur-md border-b border-white/30 transition-all duration-300">
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        {/* Menu button for mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 rounded-lg bg-white/60 hover:bg-white/80 flex items-center justify-center text-plum transition-all"
        >
          <Menu size={20} />
        </button>

        {/* Spacer */}
        <div className="flex-1 lg:hidden" />

        {/* Avatar */}
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-coral to-plum border-2 border-white shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300">
          <div className="text-white font-bold text-sm">SK</div>
        </div>
      </div>
    </header>
  );
}
