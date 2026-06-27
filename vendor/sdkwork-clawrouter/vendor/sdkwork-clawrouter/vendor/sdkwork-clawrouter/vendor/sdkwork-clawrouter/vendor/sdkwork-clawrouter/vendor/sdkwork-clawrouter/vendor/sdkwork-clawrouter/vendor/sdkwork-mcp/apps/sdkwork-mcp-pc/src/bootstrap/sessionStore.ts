export interface SdkworkMCPPcSessionContext {
  tenantId?: string;
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  appId?: string;
  environment?: string;
  deploymentMode?: string;
  permissionScope?: string[];
  standardRoleCodes?: readonly string[];
}

export interface SdkworkMCPPcSessionSnapshot {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
  sessionId?: string;
  context?: SdkworkMCPPcSessionContext;
  updatedAt?: string;
}

export interface SdkworkMCPPcSessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SdkworkMCPPcSessionStore {
  clearSession(): void;
  getSnapshot(): SdkworkMCPPcSessionSnapshot;
  refreshSession(): SdkworkMCPPcSessionSnapshot;
  setSession(nextSession: SdkworkMCPPcSessionSnapshot): void;
  subscribe(listener: (snapshot: SdkworkMCPPcSessionSnapshot) => void): () => void;
}

export const SDKWORK_MCP_PC_SESSION_STORAGE_KEY = 'sdkwork-mcp-pc-session';

function readInitialSession(
  storage: SdkworkMCPPcSessionStorageLike | undefined,
  storageKey: string,
): SdkworkMCPPcSessionSnapshot {
  if (!storage) {
    return {};
  }

  try {
    const raw = storage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as SdkworkMCPPcSessionSnapshot) : {};
  } catch {
    return {};
  }
}

export function createSdkworkMCPPcSessionStore(
  storage?: SdkworkMCPPcSessionStorageLike,
  storageKey = SDKWORK_MCP_PC_SESSION_STORAGE_KEY,
): SdkworkMCPPcSessionStore {
  let snapshot = readInitialSession(storage, storageKey);
  const listeners = new Set<(nextSnapshot: SdkworkMCPPcSessionSnapshot) => void>();

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

export function hasSdkworkMCPPcIamSession(snapshot: SdkworkMCPPcSessionSnapshot): boolean {
  return Boolean(snapshot.authToken && snapshot.accessToken && snapshot.context?.tenantId);
}
