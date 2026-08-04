import { useSyncExternalStore } from 'react';

import {
  hasPortalIamSession,
  subscribePortalSessionChange,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

export function usePortalIamSession(): boolean {
  return useSyncExternalStore(
    subscribePortalSessionChange,
    hasPortalIamSession,
    () => false,
  );
}
