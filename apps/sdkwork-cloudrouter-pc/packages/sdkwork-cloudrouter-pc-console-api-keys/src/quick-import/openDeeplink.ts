/**
 * Custom-protocol ("deep link") opening helper.
 *
 * A web page cannot query the OS protocol registry, so installation is
 * inferred from browser behavior: launching a registered protocol hands
 * focus to the OS/app (blur / visibilitychange / focus polling), while an
 * unregistered protocol fails silently and the page keeps focus. We probe
 * through a hidden iframe (so the SPA itself never navigates away) and call
 * `onUnavailable` when no hand-off was observed within the timeout.
 *
 * This is a heuristic: a slow app start or a browser that keeps page focus
 * while showing its "open app?" prompt can produce a false negative, so
 * callers must always pair the fallback with the manual import path.
 */

export const DEEPLINK_PROBE_TIMEOUT_MS = 1800;

export interface OpenDeeplinkHandle {
  /** Cancels the probe and cleanup without invoking the fallback. */
  cancel: () => void;
}

export function openDeeplink(url: string, onUnavailable: () => void): OpenDeeplinkHandle {
  let settled = false;
  let timer: number | null = null;

  const cleanup = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    window.removeEventListener('blur', markHandled);
    document.removeEventListener('visibilitychange', markHandled);
    window.removeEventListener('focus', markHandled);
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  const markHandled = () => {
    if (settled) {
      return;
    }
    settled = true;
    cleanup();
  };

  const fail = () => {
    if (settled) {
      return;
    }
    settled = true;
    cleanup();
    onUnavailable();
  };

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');

  window.addEventListener('blur', markHandled);
  document.addEventListener('visibilitychange', markHandled);
  // Some engines briefly blur and re-focus the page before handing off;
  // a focus within the probe window still counts as the app taking over.
  window.addEventListener('focus', markHandled);
  timer = window.setTimeout(fail, DEEPLINK_PROBE_TIMEOUT_MS);

  document.body.appendChild(iframe);
  try {
    iframe.contentWindow?.location.replace(url);
  } catch {
    // Navigating a cross-origin frame to a custom protocol can throw in some
    // engines; the timer still reports the unavailable case afterwards.
  }

  return { cancel: () => markHandled() };
}
