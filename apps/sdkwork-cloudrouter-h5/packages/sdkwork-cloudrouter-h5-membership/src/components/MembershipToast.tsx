import { useCallback, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export type MembershipToastTone = 'error' | 'success';

interface MembershipToastState {
  readonly id: number;
  readonly message: string;
  readonly tone: MembershipToastTone;
}

/**
 * In-page commerce feedback.
 *
 * The membership flow stays on the page while it creates an order, so failures
 * (email-required, sold-out package, network) surface as a toast instead of a
 * blocking dialog the buyer has to dismiss before retrying.
 */
export function useMembershipToast() {
  const [toasts, setToasts] = useState<MembershipToastState[]>([]);
  const counter = useRef(0);

  const pushToast = useCallback((message: string, tone: MembershipToastTone = 'success') => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const ToastOutlet = useCallback(function MembershipToastOutlet() {
    if (toasts.length === 0) {
      return null;
    }
    return (
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => {
          const Icon = toast.tone === 'error' ? AlertCircle : CheckCircle2;
          return (
            <p
              className={`pointer-events-auto flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium shadow-lg ${
                toast.tone === 'error'
                  ? 'bg-danger text-white'
                  : 'bg-emerald-600 text-white'
              }`}
              key={toast.id}
              role="status"
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{toast.message}</span>
            </p>
          );
        })}
      </div>
    );
  }, [toasts]);

  return { pushToast, ToastOutlet };
}
