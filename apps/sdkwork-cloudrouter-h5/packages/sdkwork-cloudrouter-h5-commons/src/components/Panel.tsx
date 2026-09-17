import type { ReactNode } from 'react';

import { cn } from '../utils.js';

export interface PanelProps {
  readonly title?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Panel({ title, action, children, className }: PanelProps) {
  return (
    <section className={cn('rounded-xl border border-white/10 bg-white/5 p-4', className)}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold text-gray-100">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
