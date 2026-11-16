import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { CashierTokenSecretReveal } from '@sdkwork/cloudrouter-pc-admin-core/sdk';

/** Minimum signing-key length enforced by the backend. */
export const CASHIER_TOKEN_MIN_KEY_LENGTH = 32;
/** Maximum signing-key length enforced by the backend. */
export const CASHIER_TOKEN_MAX_KEY_LENGTH = 512;

const KEY_PATTERN = /^[A-Za-z0-9\-_+/=]+$/u;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Validates an operator-supplied signing key before it is sent.
 *
 * @param value - the raw input.
 * @returns `null` when valid, otherwise a stable reason code.
 */
export function validateCashierTokenKey(value: string): 'empty' | 'too-short' | 'too-long' | 'charset' | null {
  const trimmed = value.trim();
  if (!trimmed) return 'empty';
  if (trimmed.length < CASHIER_TOKEN_MIN_KEY_LENGTH) return 'too-short';
  if (trimmed.length > CASHIER_TOKEN_MAX_KEY_LENGTH) return 'too-long';
  if (!KEY_PATTERN.test(trimmed)) return 'charset';
  return null;
}

function ModalShell({
  title,
  description,
  children,
  footer,
  onClose,
  busy,
}: {
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
  readonly footer: React.ReactNode;
  readonly onClose: () => void;
  readonly busy: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  // Keep callbacks in refs so the mount effect is not re-run (and focus not
  // stolen back) every time the parent re-renders.
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initialFocusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const initialFirst = initialFocusables?.[0];
    if (initialFirst) {
      initialFirst.focus();
    } else {
      dialogRef.current?.focus();
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onPointerDown={(event) => {
        if (!busy && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white" id={titleId}>
            {title}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400" id={descriptionId}>
            {description}
          </p>
        </div>
        <div className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{children}</div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10">{footer}</div>
      </div>
    </div>
  );
}

export interface CashierTokenRevealDialogProps {
  readonly revealed: CashierTokenSecretReveal;
  /** Human-readable label for the scope that supplied the key. */
  readonly sourceLabel: string;
  /** Stored key fingerprint, so the operator can match the key to the overview. */
  readonly fingerprint?: string;
  readonly onClose: () => void;
}

/**
 * Shows the stored signing key, masked by default.
 *
 * The key is never rendered until the operator asks for it, and the plaintext
 * exists only while this dialog is mounted.
 */
export function CashierTokenRevealDialog({
  revealed,
  sourceLabel,
  fingerprint,
  onClose,
}: CashierTokenRevealDialogProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [computedFingerprint, setComputedFingerprint] = useState<string | null>(null);
  const key = revealed.key ?? '';

  // Fingerprint the key that is actually being displayed. The metadata may be
  // stale (another admin may have rotated since this page loaded), so the stored
  // fingerprint is only a fallback when Web Crypto is unavailable.
  useEffect(() => {
    if (!key) {
      setComputedFingerprint(null);
      return;
    }
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      setComputedFingerprint(null);
      return;
    }
    let cancelled = false;
    const bytes = new TextEncoder().encode(key);
    void subtle
      .digest('SHA-256', bytes)
      .then((digest) => {
        if (cancelled) {
          return;
        }
        const hex = Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join('');
        setComputedFingerprint(hex);
      })
      .catch(() => {
        if (!cancelled) {
          setComputedFingerprint(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const effectiveFingerprint = computedFingerprint ?? fingerprint ?? null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <ModalShell
      busy={false}
      description={t(
        'admin.commerce.payments.cashierToken.revealDesc',
        'This is the key that signs the server-side cashier capability token (short links resolve to it). This reveal is audited. Anyone holding it can forge a payable link, so store it in a secret manager and never paste it into chat or tickets.',
      )}
      footer={(
        <button
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          onClick={onClose}
          type="button"
        >
          {t('admin.commerce.payments.dialog.close', 'Close')}
        </button>
      )}
      onClose={onClose}
      title={t('admin.commerce.payments.cashierToken.revealTitle', 'View signing key')}
    >
      {revealed.key ? (
        <div className="space-y-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <p className="break-all font-mono text-xs text-slate-900 dark:text-white">
              {visible ? key : '•'.repeat(Math.min(key.length, 64))}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              onClick={() => setVisible((current) => !current)}
              type="button"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {visible
                ? t('admin.commerce.payments.cashierToken.hideKey', 'Hide')
                : t('admin.commerce.payments.cashierToken.showKey', 'Show')}
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              onClick={() => void copy()}
              type="button"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied
                ? t('admin.commerce.payments.cashierToken.copied', 'Copied')
                : t('admin.commerce.payments.cashierToken.copyKey', 'Copy')}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.cashierToken.revealEpoch', 'Epoch {{epoch}} · {{source}}', {
                epoch: revealed.keyEpoch ?? '—',
                source: sourceLabel,
              })}
            </span>
          </div>
          {effectiveFingerprint ? (
            <p className="break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.cashierToken.revealFingerprint', 'Fingerprint: {{fingerprint}}', {
                fingerprint: effectiveFingerprint,
              })}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-300" role="status">
          {t(
            'admin.commerce.payments.cashierToken.revealNotConfigured',
            'No signing key is stored for this tenant yet. The payment center generates one on first cashier mint, or you can set one manually. The deployment secret only encrypts the stored key; it is not the signing key.',
          )}
        </p>
      )}
    </ModalShell>
  );
}

export interface CashierTokenSetDialogProps {
  readonly initialExpectedEpoch?: string;
  readonly saving: boolean;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onSave: (key: string) => void;
}

/**
 * Accepts an operator-supplied signing key.
 *
 * Saving behaves like a rotation: the epoch advances and the replaced key keeps
 * verifying for one hour, so links scanned just before the change still settle.
 */
export function CashierTokenSetDialog({
  initialExpectedEpoch,
  saving,
  error,
  onClose,
  onSave,
}: CashierTokenSetDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const problem = validateCashierTokenKey(value);
  const showProblem = touched && problem !== null;

  const problemText = problem === 'too-short'
    ? t('admin.commerce.payments.cashierToken.keyTooShort', 'At least 32 characters are required.')
    : problem === 'too-long'
      ? t('admin.commerce.payments.cashierToken.keyTooLong', 'At most 512 characters are allowed.')
      : problem === 'charset'
        ? t('admin.commerce.payments.cashierToken.keyCharset', 'Only letters, digits and - _ + / = are allowed.')
        : problem === 'empty'
          ? t('admin.commerce.payments.cashierToken.keyRequired', 'Enter the signing key.')
          : '';

  const submit = () => {
    setTouched(true);
    if (problem !== null) {
      return;
    }
    onSave(value.trim());
  };

  return (
    <ModalShell
      busy={saving}
      description={t(
        'admin.commerce.payments.cashierToken.setDesc',
        'Saving advances the key epoch immediately. New short links use the new key; links minted with the previous key keep resolving for one hour, so payers who already scanned are not interrupted.',
      )}
      footer={(
        <>
          <button
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            {t('admin.commerce.payments.dialog.cancel', 'Cancel')}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-lobster-600 px-4 py-2 text-sm font-medium text-white hover:bg-lobster-700 disabled:opacity-60"
            disabled={saving}
            onClick={submit}
            type="button"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving
              ? t('admin.commerce.payments.dialog.saving', 'Saving...')
              : t('admin.commerce.payments.cashierToken.setSave', 'Save key')}
          </button>
        </>
      )}
      onClose={onClose}
      title={t('admin.commerce.payments.cashierToken.setTitle', 'Set signing key manually')}
    >
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        <span>{t('admin.commerce.payments.cashierToken.setLabel', 'Signing key')}</span>
        <textarea
          className="mt-1.5 h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
          disabled={saving}
          onChange={(event) => {
            setValue(event.target.value);
            setTouched(true);
          }}
          placeholder={t(
            'admin.commerce.payments.cashierToken.setPlaceholder',
            'Paste at least 32 characters of key material',
          )}
          spellCheck={false}
          value={value}
        />
      </label>
      {showProblem ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{problemText}</p>
      ) : (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {t(
            'admin.commerce.payments.cashierToken.setHint',
            'Use a value from your secret manager. The current key is replaced, not shown, unless you view it first.',
          )}
        </p>
      )}
      {initialExpectedEpoch ? (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {t('admin.commerce.payments.cashierToken.setExpectedEpoch', 'Expected epoch: {{epoch}}', {
            epoch: initialExpectedEpoch,
          })}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
    </ModalShell>
  );
}
