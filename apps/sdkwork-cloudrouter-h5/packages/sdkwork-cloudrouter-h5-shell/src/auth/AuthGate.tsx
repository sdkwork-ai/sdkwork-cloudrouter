/**
 * @deprecated The H5 login UI is the shared `@sdkwork/iam-h5-auth` surface
 * (password/code/register/recovery/scan/third-party). This local credential
 * form is retained only for source stability and is no longer exported from
 * the shell package or rendered by the application; do not reintroduce it.
 */
import { useState, type FormEvent } from 'react';
import { ArrowLeft, Route, ShieldCheck } from 'lucide-react';

export interface ConsoleSignInLabels {
  readonly title: string;
  readonly hint: string;
  readonly email: string;
  readonly password: string;
  readonly submit: string;
  readonly submitting: string;
  readonly failed: string;
  readonly back: string;
}

export interface ConsoleSignInCredentials {
  readonly email: string;
  readonly password: string;
}

export interface ConsoleSignInPageProps {
  readonly labels: ConsoleSignInLabels;
  readonly brand: string;
  readonly subtitle: string;
  readonly onSignIn: (credentials: ConsoleSignInCredentials) => Promise<void>;
  readonly onBack: () => void;
}

/**
 * Full-screen console sign-in page.
 *
 * It renders outside the tab shell (the sign-in route is never a tab) and owns
 * only the credential form and its local error state; the app root supplies the
 * sign-in effect wired to the generated app SDK auth flow. Layout follows the
 * shared H5 design language: a full-bleed surface with the documented 0.9rem
 * content inset, not a page-level gutter.
 */
export function ConsoleSignInPage({ labels, brand, subtitle, onSignIn, onBack }: ConsoleSignInPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSignIn({ email, password });
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : labels.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-line bg-surface px-[0.9rem] pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
        >
          <Route className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight tracking-tight">{brand}</p>
          <p className="truncate text-[11px] leading-4 text-ink-subtle">{subtitle}</p>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center bg-surface px-[0.9rem] py-10">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-5">
          <header className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              SDKWork IAM
            </span>
            <h1 className="pt-1 text-xl font-semibold tracking-tight">{labels.title}</h1>
            <p className="text-[12px] leading-5 text-ink-muted">{labels.hint}</p>
          </header>
          <label className="block space-y-1.5 text-[12px]">
            <span className="font-medium text-ink-muted">{labels.email}</span>
            <input
              type="text"
              value={email}
              autoComplete="username"
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="block space-y-1.5 text-[12px]">
            <span className="font-medium text-ink-muted">{labels.password}</span>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] text-danger"
            >
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="w-full rounded-xl bg-brand-fill px-4 py-3 text-sm font-semibold text-on-brand shadow-sm transition-opacity disabled:opacity-60"
          >
            {busy ? labels.submitting : labels.submit}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="mx-auto flex items-center justify-center gap-1.5 text-[12px] font-medium text-brand"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {labels.back}
          </button>
        </form>
      </main>
    </div>
  );
}
