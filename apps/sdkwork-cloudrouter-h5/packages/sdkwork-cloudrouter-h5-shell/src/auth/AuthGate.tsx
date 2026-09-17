import { useState, type FormEvent, type ReactNode } from 'react';

export interface ConsoleSignInLabels {
  readonly title: string;
  readonly hint: string;
  readonly email: string;
  readonly password: string;
  readonly submit: string;
  readonly submitting: string;
  readonly failed: string;
}

export interface ConsoleSignInCredentials {
  readonly email: string;
  readonly password: string;
}

export interface AuthGateProps {
  readonly authenticated: boolean;
  readonly labels: ConsoleSignInLabels;
  readonly brand: string;
  readonly onSignIn: (credentials: ConsoleSignInCredentials) => Promise<void>;
  readonly children: ReactNode;
}

/**
 * Authentication gate. The gate owns only the credential form and the session
 * decision; the app root supplies the sign-in effect wired to the generated
 * app SDK auth flow.
 */
export function AuthGate({ authenticated, labels, brand, onSignIn, children }: AuthGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authenticated) return <>{children}</>;

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
    <div className="flex min-h-screen items-center justify-center bg-[#141414] px-6 text-gray-100">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">{labels.title}</h1>
          <p className="text-[11px] text-gray-400">{labels.hint}</p>
        </header>
        <label className="block space-y-1 text-xs">
          <span className="text-gray-300">{labels.email}</span>
          <input
            type="text"
            value={email}
            autoComplete="username"
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/40"
          />
        </label>
        <label className="block space-y-1 text-xs">
          <span className="text-gray-300">{labels.password}</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/40"
          />
        </label>
        {error && <p className="text-xs text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {busy ? labels.submitting : labels.submit}
        </button>
        <p className="text-center text-[10px] text-gray-500">{brand}</p>
      </form>
    </div>
  );
}
