/**
 * Clipboard primitives for values an operator must reproduce verbatim.
 *
 * The DNS-01 TXT value is the case this exists for: it is a public ACME proof,
 * it is long, and a single mistyped character costs a failed validation (Let's
 * Encrypt allows five per account per hostname per hour). Copying is therefore a
 * correctness feature, not a convenience one — which is why the fallback path is
 * explicit rather than a silent no-op on browsers without the async clipboard.
 *
 * The port is injected so the behaviour is testable without a DOM: the page
 * passes nothing and the default port reads the globals.
 */

export interface ClipboardPort {
  /** Async clipboard, available on secure origins. */
  writeText?: (text: string) => Promise<void>;
  /** Legacy selection-based copy, used when the async API is unavailable. */
  legacyCopy?: (text: string) => boolean;
}

const EMPTY_VALUE_MESSAGE = 'clipboard value is empty';

function defaultPort(): ClipboardPort {
  const clipboard =
    typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function'
      ? navigator.clipboard
      : undefined;
  return {
    writeText: clipboard ? (text: string) => clipboard.writeText(text) : undefined,
    legacyCopy: (text: string) => legacyCopyWithTextarea(text),
  };
}

/**
 * Copies `value`, returning whether it landed.
 *
 * Empty or whitespace-only values are refused: a "copied" toast over nothing is
 * worse than a disabled button, because the operator moves on believing the
 * record is in their clipboard.
 */
export async function copyToClipboard(
  value: string,
  port: ClipboardPort = defaultPort(),
): Promise<boolean> {
  if (value.trim().length === 0) {
    return false;
  }
  if (port.writeText) {
    try {
      await port.writeText(value);
      return true;
    } catch {
      // Permission denied or an insecure context: fall through to the legacy
      // path rather than reporting a failure the operator cannot act on.
    }
  }
  if (port.legacyCopy) {
    try {
      return port.legacyCopy(value);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Selection-based copy for browsers where `navigator.clipboard` is unavailable.
 *
 * The textarea is created off-screen and removed in a `finally`, so a refused
 * copy cannot leave focusable debris in the dialog.
 */
function legacyCopyWithTextarea(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) {
    return false;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  try {
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export const CLIPBOARD_EMPTY_VALUE_MESSAGE = EMPTY_VALUE_MESSAGE;
