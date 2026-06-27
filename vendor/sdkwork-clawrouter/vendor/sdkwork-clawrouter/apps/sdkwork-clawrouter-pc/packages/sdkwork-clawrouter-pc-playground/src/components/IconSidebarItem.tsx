import React from 'react';

export function IconSidebarItem({ icon, label, active, isPrimary, onClick }: { icon: React.ReactNode, label: string, active: boolean, isPrimary?: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center justify-center gap-1.5 w-16 h-16 rounded-xl transition-all duration-200 relative
        ${active
          ? isPrimary ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-[#1f1f1f] text-white border border-white/5 shadow-sm'
          : 'text-slate-500 hover:bg-[#1a1a1a] hover:text-slate-300'}
      `}
    >
      {icon}
      <span className="text-[10px] sm:text-xs font-medium tracking-wide w-full px-1 truncate text-center">{label}</span>

      {/* Active Indicator line (for non-primary) */}
      {active && !isPrimary && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
      )}
    </button>
  );
}
