import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { copyToClipboard } from './domainClipboard';

export interface DomainCopyButtonProps {
  /** The exact value to copy. Never rendered in a tooltip or log. */
  value: string;
  /** Visible label, already translated by the caller. */
  label: string;
  /** Announced and shown for a short moment after a successful copy. */
  copiedLabel: string;
  /** Announced when the browser refused the copy. */
  failedLabel: string;
  disabled?: boolean;
  className?: string;
  onCopied?: () => void;
}

/** How long the success state stays visible before returning to the label. */
const COPIED_STATE_MS = 2000;

/**
 * Copy control for a verification value (DNS-01 TXT content, HTTP-01 token).
 *
 * Behaviour that matters for the issuance flow:
 *
 * * The value is copied verbatim — no trimming, no case folding, no quoting. A
 *   pasted TXT record must equal what the CA issued.
 * * Success is announced through a live region, so a screen-reader user learns
 *   the copy happened without hunting for a color change.
 * * A refusal leaves the button usable instead of pretending it worked; the
 *   operator can select and copy manually.
 * * The pending timer is cleared on unmount, so closing the drawer cannot set
 *   state on a gone component.
 */
export function DomainCopyButton({
  value,
  label,
  copiedLabel,
  failedLabel,
  disabled = false,
  className = '',
  onCopied,
}: DomainCopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const copy = async () => {
    const copied = await copyToClipboard(value);
    setState(copied ? 'copied' : 'failed');
    if (copied) {
      onCopied?.();
    }
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setState('idle');
    }, COPIED_STATE_MS);
  };

  const visibleLabel = state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : label;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        disabled={disabled || value.trim().length === 0}
        onClick={() => void copy()}
        aria-label={label}
        title={label}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-600 transition hover:border-lobster-400 hover:text-lobster-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#121212] dark:text-slate-300 dark:hover:text-lobster-300"
      >
        {state === 'copied' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        <span>{visibleLabel}</span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : ''}
      </span>
    </span>
  );
}
