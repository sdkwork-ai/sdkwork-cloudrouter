import { useEffect, useState } from 'react';
import {
  DataCenterBackendPendingError,
  isDataCenterBackendAvailable,
} from './dataCenterService';

export type DataCenterQueryState<T> =
  | { phase: 'pending-backend' }
  | { phase: 'loading' }
  | { phase: 'ready'; data: T }
  | { phase: 'error'; message: string };

/**
 * Runs one data-center read on mount.
 *
 * `load` must be stable (wrap it in `useCallback`); a new identity re-runs the
 * read. The returned state distinguishes "backend not provisioned" from
 * "ready but empty", because both would otherwise render as an empty table and
 * hide a deployment gap.
 */
export function useDataCenterQuery<T>(load: () => Promise<T>): DataCenterQueryState<T> {
  const [state, setState] = useState<DataCenterQueryState<T>>(() => (
    isDataCenterBackendAvailable() ? { phase: 'loading' } : { phase: 'pending-backend' }
  ));

  useEffect(() => {
    if (!isDataCenterBackendAvailable()) {
      setState({ phase: 'pending-backend' });
      return undefined;
    }

    let active = true;
    setState({ phase: 'loading' });
    load().then(
      (data) => {
        if (active) {
          setState({ phase: 'ready', data });
        }
      },
      (error: unknown) => {
        if (!active) {
          return;
        }
        if (error instanceof DataCenterBackendPendingError) {
          setState({ phase: 'pending-backend' });
          return;
        }
        setState({
          phase: 'error',
          message: error instanceof Error ? error.message : 'Data center request failed.',
        });
      },
    );

    return () => {
      active = false;
    };
  }, [load]);

  return state;
}
