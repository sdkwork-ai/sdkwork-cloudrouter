import { useSyncExternalStore } from 'react';

import {
  hasPortalIamSession,
  subscribePortalSessionChange,
} from '@sdkwork/clawroutes-pc-commons/runtime';

export function usePortalIamSession(): boolean {
  return useSyncExternalStore(
    subscribePortalSessionChange,
    hasPortalIamSession,
    () => false,
  );
}
