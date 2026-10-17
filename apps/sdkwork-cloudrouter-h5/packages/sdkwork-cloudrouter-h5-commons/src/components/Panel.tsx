import type { ReactNode } from 'react';

import { cn } from '../utils.js';

export interface PanelProps {
  readonly title?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Full-bleed section surface.
 *
 * Per `APP_MOBILE_REACT_UI_SPEC.md` section 5 a block that spans the viewport
 * width keeps square corners and zero horizontal margin; the documented
 * surface content inset is the 0.9rem token applied as the surface's own
 * horizontal padding. Page rhythm comes from vertical spacing and surface
 * contrast, not page gutters.
 */
export function Panel({ title, action, children, className }: PanelProps) {
  return (
    <section className={cn('border-b border-white/10 bg-white/5 px-[0.9rem] py-3', className)}>
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
