import {
  type AppLifecycleAdapter,
  type CloudRouterHostAdapterResult,
  type NetworkStatusAdapter,
  type SecureStorageAdapter,
} from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-core';

/**
 * HarmonyOS host adapter implementations.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 7. Adapters
 * expose typed methods and stable user-safe errors. They must not own login,
 * token refresh, permission evaluation, business authorization, or raw
 * business API transport.
 *
 * The platform-backed implementations require the HarmonyOS SDK toolchain and
 * a concrete ability context; the capability set and method signatures are
 * fixed here so feature code compiles unchanged against any host. Every method
 * currently reports the user-safe `unsupported` error instead of pretending to
 * persist or read platform state.
 */

export class HarmonySecureStorageAdapter implements SecureStorageAdapter {
  get(key: string): Promise<CloudRouterHostAdapterResult<string>> {
    return Promise.resolve({ ok: false, error: 'unsupported' });
  }

  set(key: string, value: string): Promise<CloudRouterHostAdapterResult<void>> {
    return Promise.resolve({ ok: false, error: 'unsupported' });
  }

  remove(key: string): Promise<CloudRouterHostAdapterResult<void>> {
    return Promise.resolve({ ok: false, error: 'unsupported' });
  }

  clear(): Promise<CloudRouterHostAdapterResult<void>> {
    return Promise.resolve({ ok: false, error: 'unsupported' });
  }
}

export class HarmonyNetworkStatusAdapter implements NetworkStatusAdapter {
  isOnline(): Promise<CloudRouterHostAdapterResult<boolean>> {
    return Promise.resolve({ ok: false, error: 'unsupported' });
  }
}

export class HarmonyAppLifecycleAdapter implements AppLifecycleAdapter {
  currentState(): Promise<CloudRouterHostAdapterResult<string>> {
    return Promise.resolve({ ok: false, error: 'unsupported' });
  }
}

export interface CloudRouterHarmonyHostAdapters {
  readonly capabilities: string[];
  readonly secureStorage: SecureStorageAdapter;
  readonly networkStatus: NetworkStatusAdapter;
  readonly appLifecycle: AppLifecycleAdapter;
}

export function createHostAdapters(): CloudRouterHarmonyHostAdapters {
  return {
    capabilities: ['secureStorage', 'networkStatus', 'appLifecycle'],
    secureStorage: new HarmonySecureStorageAdapter(),
    networkStatus: new HarmonyNetworkStatusAdapter(),
    appLifecycle: new HarmonyAppLifecycleAdapter(),
  };
}
