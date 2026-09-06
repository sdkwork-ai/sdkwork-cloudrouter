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
export declare const DEEPLINK_PROBE_TIMEOUT_MS = 1800;
export interface OpenDeeplinkHandle {
    /** Cancels the probe and cleanup without invoking the fallback. */
    cancel: () => void;
}
export declare function openDeeplink(url: string, onUnavailable: () => void): OpenDeeplinkHandle;
//# sourceMappingURL=openDeeplink.d.ts.map