import { useEffect, type ReactNode } from 'react';

import { ADMIN_MODAL_PANEL_CLASS } from './adminSurface';

export interface AdminModalShellProps {
  children: ReactNode;
  /** Id of the heading inside the panel, wired to `aria-labelledby`. */
  labelledBy: string;
  onClose: () => void;
  /** Panel width utility; defaults to the two-column form width. */
  widthClass?: string;
}

/**
 * Dialog panel for the locally authored IAM admin pages.
 *
 * The shell's own cards use the neutral admin surface (`white` / `#171717`); the
 * dialog has to use the same surface and border, otherwise a page whose list is
 * aligned still pops a dialog that belongs to the old slate theme. Escape closes
 * the dialog, and a click on the backdrop (never inside the panel) closes it too.
 */
export function AdminModalShell({
  children,
  labelledBy,
  onClose,
  widthClass = 'max-w-2xl',
}: AdminModalShellProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 dark:bg-black/60"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={`${ADMIN_MODAL_PANEL_CLASS} ${widthClass}`}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}
