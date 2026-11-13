import { LockKeyhole } from 'lucide-react';

export interface SessionRequiredStateProps {
  readonly title: string;
  readonly message: string;
  readonly action: string;
  readonly onSignIn: () => void;
}

/**
 * In-canvas session gate for a protected tab.
 *
 * The shell (and its tab bar) stays visible so the visitor can keep browsing the
 * public home or the pricing catalog surface; only the protected tab's content
 * is replaced by this state, which links to the dedicated sign-in route.
 */
export function SessionRequiredState({ title, message, action, onSignIn }: SessionRequiredStateProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center bg-surface px-[0.9rem] py-16 text-center">
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"
      >
        <LockKeyhole className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mt-1.5 max-w-xs text-[12px] leading-5 text-ink-subtle">{message}</p>
      <button
        type="button"
        onClick={onSignIn}
        className="mt-6 rounded-full bg-brand-fill px-6 py-2.5 text-sm font-semibold text-on-brand shadow-sm transition-opacity active:opacity-80"
      >
        {action}
      </button>
    </section>
  );
}
