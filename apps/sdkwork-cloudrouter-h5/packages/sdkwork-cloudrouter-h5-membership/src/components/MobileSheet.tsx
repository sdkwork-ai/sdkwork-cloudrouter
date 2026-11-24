import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface MobileSheetProps {
  readonly children: ReactNode;
  readonly closeLabel: string;
  readonly description?: string;
  readonly footer?: ReactNode;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly title: string;
}

/**
 * Mobile bottom sheet used by every membership commerce step.
 *
 * A phone buyer acts with the thumb: actions live at the bottom, the sheet owns
 * the safe-area inset, and the scrim dismisses it. Dialogs never stack on top of
 * the page scroll, which keeps the membership screen's scroll position stable.
 */
export function MobileSheet({
  children,
  closeLabel,
  description,
  footer,
  onClose,
  open,
  title,
}: MobileSheetProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="presentation">
      <button
        aria-label={closeLabel}
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label={title}
        aria-modal="true"
        className="relative flex max-h-[86vh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-2xl"
        role="dialog"
      >
        <header className="shrink-0 border-b border-line px-4 pb-3 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
              {description ? (
                <p className="mt-1 text-[12px] leading-snug text-ink-subtle">{description}</p>
              ) : null}
            </div>
            <button
              aria-label={closeLabel}
              className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted active:bg-surface-elevated"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-line px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] pt-3">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
