import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

export const FilterSidebar = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <aside className={`w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-[56px] lg:h-[calc(100vh-56px)] overflow-y-auto pb-8 pr-4 hover:pr-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full transition-colors ${className}`}>
      {children}
    </aside>
  );
};

export const CollapsibleSection = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true
}: {
  title: string,
  icon?: React.ElementType,
  children: React.ReactNode,
  defaultOpen?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-200 dark:border-white/10 last:border-0 pb-6 mb-6 last:pb-0 last:mb-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white mb-4 group"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors" />}
          {title}
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FilterCheckbox = ({
  checked,
  label,
  onClick,
  icon: Icon,
  activeColorClass = "bg-lobster-500 border-lobster-500"
}: {
  checked: boolean,
  label: string | React.ReactNode,
  onClick: () => void,
  icon?: React.ReactNode,
  activeColorClass?: string
}) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer group" onClick={onClick}>
      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${checked ? activeColorClass : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400'}`}>
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex items-center gap-2 truncate">
        {Icon}
        {label}
      </span>
    </label>
  );
};
