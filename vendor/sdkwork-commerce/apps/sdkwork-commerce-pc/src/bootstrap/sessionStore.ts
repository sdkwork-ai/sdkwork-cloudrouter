export interface SdkworkCommercePcSessionSnapshot {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
  sessionId?: string;
  context?: {
    tenantId?: string;
    userId?: string;
    organizationId?: string;
    sessionId?: string;
    appId?: string;
    environment?: string;
    deploymentMode?: string;
  };
  updatedAt?: string;
}

export interface SdkworkCommercePcSessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SdkworkCommercePcSessionStore {
  clearSession(): void;
  getSnapshot(): SdkworkCommercePcSessionSnapshot;
  refreshSession(): SdkworkCommercePcSessionSnapshot;
  setSession(nextSession: SdkworkCommercePcSessionSnapshot): void;
  subscribe(listener: (snapshot: SdkworkCommercePcSessionSnapshot) => void): () => void;
}

export const SDKWORK_COMMERCE_PC_SESSION_STORAGE_KEY = "sdkwork-commerce-pc-session";

function readInitialSession(
  storage: SdkworkCommercePcSessionStorageLike | undefined,
  storageKey: string,
): SdkworkCommercePcSessionSnapshot {
  if (!storage) {
    return {};
  }

  try {
    const raw = storage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as SdkworkCommercePcSessionSnapshot) : {};
  } catch {
    return {};
  }
}

export function createSdkworkCommercePcSessionStore(
  storage?: SdkworkCommercePcSessionStorageLike,
  storageKey = SDKWORK_COMMERCE_PC_SESSION_STORAGE_KEY,
): SdkworkCommercePcSessionStore {
  let snapshot = readInitialSession(storage, storageKey);
  const listeners = new Set<(nextSnapshot: SdkworkCommercePcSessionSnapshot) => void>();

  const emit = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const persist = () => {
    if (!storage) {
      return;
    }

    if (!snapshot.authToken && !snapshot.accessToken && !snapshot.refreshToken) {
      storage.removeItem(storageKey);
      return;
    }

    storage.setItem(storageKey, JSON.stringify(snapshot));
  };

  return {
    clearSession() {
      snapshot = {};
      persist();
      emit();
    },
    getSnapshot() {
      return snapshot;
    },
    refreshSession() {
      snapshot = readInitialSession(storage, storageKey);
      emit();
      return snapshot;
    },
    setSession(nextSession) {
      snapshot = {
        ...nextSession,
        updatedAt: new Date().toISOString(),
      };
      persist();
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function hasSdkworkCommercePcIamSession(
  snapshot: SdkworkCommercePcSessionSnapshot,
): boolean {
  return Boolean(snapshot.authToken && snapshot.accessToken && snapshot.context?.tenantId);
}
