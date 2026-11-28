/**
 * Query hook for the operator data screen.
 *
 * The screen is a wall display: it must survive a failing module, refresh on a
 * fixed cadence, and keep the last good snapshot on screen while the next one
 * loads. The hook owns exactly those three behaviors so the page stays a pure
 * renderer over {@link DataScreenSnapshot}.
 *
 * - `load` must be stable (wrap it in `useCallback`); a new identity restarts
 *   the poller.
 * - `enabled: false` pauses both the first load and the polling.
 * - A failed refresh keeps the previous snapshot and only flips `stale`, because
 *   blanking a wall on one transient error is worse than showing a stale minute.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataScreenSnapshot } from './dataScreenService';

export type DataScreenPhase = 'loading' | 'ready' | 'empty';

export interface DataScreenQueryState {
  phase: DataScreenPhase;
  snapshot: DataScreenSnapshot | null;
  /** True while a refresh is in flight and a snapshot is already visible. */
  refreshing: boolean;
  /** True when the latest refresh failed but a snapshot is still displayed. */
  stale: boolean;
  errorMessage: string;
  reload: () => void;
}

export interface UseDataScreenQueryOptions {
  enabled?: boolean;
  /** Polling cadence in milliseconds; `0` disables polling. */
  refreshIntervalMs?: number;
  /** Hard ceiling for one load; the phase leaves `loading` when it elapses. */
  loadTimeoutMs?: number;
}

const DEFAULT_LOAD_TIMEOUT_MS = 30_000;

/**
 * Runs the data screen load on mount and on the polling cadence.
 *
 * `load` must be stable (wrap it in `useCallback`); a new identity restarts the
 * poller. `enabled: false` pauses both the first load and the polling. A failed
 * refresh keeps the previous snapshot and only flips `stale`, because blanking a
 * wall on one transient error is worse than showing a stale minute.
 *
 * The hook also owns the load ceiling: a wall that waits forever on one stuck
 * module shows nothing, so `loadTimeoutMs` bounds the `loading` phase even when
 * the service itself never settles.
 */
export function useDataScreenQuery(
  load: () => Promise<DataScreenSnapshot>,
  options: UseDataScreenQueryOptions = {},
): DataScreenQueryState {
  const { enabled = true, refreshIntervalMs = 0, loadTimeoutMs = DEFAULT_LOAD_TIMEOUT_MS } = options;
  const [phase, setPhase] = useState<DataScreenPhase>('loading');
  const [snapshot, setSnapshot] = useState<DataScreenSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [requestTick, setRequestTick] = useState(0);
  const snapshotRef = useRef<DataScreenSnapshot | null>(null);
  snapshotRef.current = snapshot;

  const reload = useCallback(() => setRequestTick((tick) => tick + 1), []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async (): Promise<void> => {
      const hasSnapshot = snapshotRef.current !== null;
      if (hasSnapshot) {
        setRefreshing(true);
      } else {
        setPhase('loading');
      }
      try {
        const next = await withDeadline(load(), loadTimeoutMs);
        if (!active) {
          return;
        }
        setSnapshot(next);
        setPhase('ready');
        setStale(false);
        setErrorMessage('');
      } catch (error) {
        if (!active) {
          return;
        }
        const message = error instanceof Error && error.message ? error.message : 'Data screen request failed.';
        if (snapshotRef.current) {
          setStale(true);
          setErrorMessage(message);
        } else {
          setPhase('empty');
          setErrorMessage(message);
        }
      } finally {
        if (active) {
          setRefreshing(false);
          if (refreshIntervalMs > 0) {
            timer = setTimeout(() => void run(), refreshIntervalMs);
          }
        }
      }
    };

    void run();
    return () => {
      active = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [enabled, load, loadTimeoutMs, refreshIntervalMs, requestTick]);

  return { phase, snapshot, refreshing, stale, errorMessage, reload };
}

/**
 * Races `request` against a deadline. The losing request keeps running (it is a
 * plain fetch), so the timer is always cleared and the rejection is bounded to
 * one error per load.
 */
function withDeadline<T>(request: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return request;
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`The wall did not receive data within ${Math.round(timeoutMs / 1000)}s.`));
    }, timeoutMs);
    request.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
