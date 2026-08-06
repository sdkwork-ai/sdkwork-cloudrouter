import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { usePortalIamSession } from './usePortalIamSession';
import {
  claimInviteRelation,
  clearInviteTicket,
  fetchInvitePolicy,
  readInviteTicket,
  storeInviteTicket,
  validateInviteCode,
  type AppInvitePolicy,
} from './inviteCodeGate';

const REGISTER_PATH_PREFIX = '/auth/register';

/**
 * Terminal claim rejections that can never succeed on retry: invalid code,
 * self-invite (4001) and already bound to another inviter (4090). Rejections
 * like 4010 (session not ready yet) or 5xxx stay retryable.
 */
const TERMINAL_CLAIM_WIRE_CODES = new Set(['4001', '4090']);

/**
 * Pre-auth invite-code gate for the portal register flow.
 *
 * When the admin-configured invite code policy requires a code to register,
 * the Cloud Router register route shows an invite-code step before the
 * external IAM register UI renders. After a successful external registration
 * establishes a session, the validated code is claimed against the backend to
 * bind the inviter/invitee referral relation, and the ticket is cleared.
 */
export function InviteGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isAuthenticated = usePortalIamSession();
  const isRegisterPath = location.pathname === REGISTER_PATH_PREFIX
    || location.pathname.startsWith(`${REGISTER_PATH_PREFIX}/`);
  const [policy, setPolicy] = useState<AppInvitePolicy | null>(null);
  const [policyChecked, setPolicyChecked] = useState(false);
  // Marks that the invite step was completed in this mount. Without it, a
  // re-render after the 30-minute ticket TTL would re-show the code step and
  // unmount the external register form mid-fill. The ticket TTL only guards
  // the initial gate; a consumed gate stays open for the mount.
  const [gatePassed, setGatePassed] = useState(false);

  // Claim the invite relation once the new session exists (registration done).
  // The ticket is cleared on success and on terminal business rejections
  // (invalid code, self-invite, already bound) where retrying can never
  // succeed. Transient failures (network, 5xx, session not ready) keep the
  // ticket so a later gate mount within the 30-minute TTL retries.
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    const ticket = readInviteTicket();
    if (!ticket) {
      return;
    }
    claimInviteRelation(ticket.code)
      .then((result) => {
        if (!result.wireCode || TERMINAL_CLAIM_WIRE_CODES.has(result.wireCode)) {
          clearInviteTicket();
        }
      })
      .catch(() => undefined);
  }, [isAuthenticated]);

  // Resolve the admin-configured invite code policy once per gate mount.
  useEffect(() => {
    let active = true;
    fetchInvitePolicy()
      .then((nextPolicy) => {
        if (active) {
          setPolicy(nextPolicy);
        }
      })
      .catch(() => {
        if (active) {
          setPolicy(null);
        }
      })
      .finally(() => {
        if (active) {
          setPolicyChecked(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (!isRegisterPath) {
    return <>{children}</>;
  }
  // An authenticated visitor on the register path is a completed registration
  // (possibly mid-redirect after the claim cleared the ticket) or a logged-in
  // user revisiting the route; the gate must never re-block them.
  if (isAuthenticated) {
    return <>{children}</>;
  }
  if (!policyChecked) {
    return <InviteGateLoading />;
  }
  if (policy?.registerRequired && !gatePassed && !readInviteTicket()) {
    return (
      <InviteCodeStep
        onVerified={(code) => {
          setGatePassed(true);
          storeInviteTicket(code);
        }}
      />
    );
  }
  return <>{children}</>;
}

function InviteGateLoading() {
  const { t } = useTranslation();
  return (
    <div
      className="flex min-h-[480px] w-full items-center justify-center"
      role="status"
      aria-label={t('auth.inviteGate.loading', 'Checking registration policy...')}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('auth.inviteGate.loading', 'Checking registration policy...')}
        </p>
      </div>
    </div>
  );
}

function InviteCodeStep({ onVerified }: { onVerified: (code: string) => void }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError(t('auth.inviteGate.errors.required', 'Please enter an invite code.'));
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const result = await validateInviteCode(normalized);
      if (result.valid) {
        onVerified(normalized);
        return;
      }
      // The backend only returns a fixed English constant for invalid codes;
      // show the localized copy instead so non-English users get a translated
      // message. The wire `message` stays available for future server detail.
      setError(t('auth.inviteGate.errors.invalid', 'This invite code is invalid or inactive.'));
    } catch (validationError) {
      setError(validationError instanceof Error
        ? validationError.message
        : t('auth.inviteGate.errors.unavailable', 'Invite code validation is temporarily unavailable.'));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[480px] w-full max-w-md flex-col items-center justify-center px-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('auth.inviteGate.title', 'Enter an invite code')}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t('auth.inviteGate.description', 'Registration is by invitation only. Enter the invite code you received to continue.')}
        </p>
        <div className="mt-6 space-y-4">
          {error ? (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          ) : null}
          <input
            type="text"
            value={code}
            autoFocus
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void submit();
              }
            }}
            placeholder={t('auth.inviteGate.placeholder', 'Invite code')}
            disabled={checking}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm uppercase tracking-widest text-slate-700 outline-none transition-colors placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
          <button
            type="button"
            disabled={checking}
            onClick={() => void submit()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('auth.inviteGate.continue', 'Continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
