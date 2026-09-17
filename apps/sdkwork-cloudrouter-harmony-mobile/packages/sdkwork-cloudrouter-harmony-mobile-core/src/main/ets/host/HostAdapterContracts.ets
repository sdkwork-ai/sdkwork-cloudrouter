/**
 * Host adapter contracts owned by core and implemented by the host package.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 7. Host
 * adapters expose stable user-safe errors only.
 */

export type CloudRouterHostAdapterError = 'unsupported' | 'permission-denied' | 'unavailable' | 'cancelled' | 'invalid-state';

export interface CloudRouterHostAdapterResult<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: CloudRouterHostAdapterError;
}

export interface SecureStorageAdapter {
  get(key: string): Promise<CloudRouterHostAdapterResult<string>>;
  set(key: string, value: string): Promise<CloudRouterHostAdapterResult<void>>;
  remove(key: string): Promise<CloudRouterHostAdapterResult<void>>;
  clear(): Promise<CloudRouterHostAdapterResult<void>>;
}

export interface NetworkStatusAdapter {
  isOnline(): Promise<CloudRouterHostAdapterResult<boolean>>;
}

export interface AppLifecycleAdapter {
  currentState(): Promise<CloudRouterHostAdapterResult<string>>;
}
