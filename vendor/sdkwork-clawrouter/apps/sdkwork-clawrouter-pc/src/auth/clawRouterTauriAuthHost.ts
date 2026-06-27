import {
  createTauriHostBridge,
  evaluateTauriHostBridgeReadiness,
  hostTauriPackageMeta,
  type SdkworkTauriTransport,
} from '@sdkwork/host-tauri-pc-react';

type TauriGlobal = typeof globalThis & {
  __TAURI__?: {
    core?: {
      invoke?: (command: string, payload?: unknown) => Promise<unknown>;
    };
    event?: {
      listen?: <TPayload>(
        event: string,
        listener: (event: { event: string; payload: TPayload }) => void,
      ) => Promise<() => void | Promise<void>>;
    };
    window?: {
      getCurrentWindow?: () => {
        close?: () => Promise<void>;
        hide?: () => Promise<void>;
        isMaximized?: () => Promise<boolean>;
        maximize?: () => Promise<void>;
        minimize?: () => Promise<void>;
        show?: () => Promise<void>;
        unmaximize?: () => Promise<void>;
      };
    };
  };
  __TAURI_INTERNALS__?: unknown;
};

function readTauriGlobal(): TauriGlobal {
  return globalThis as TauriGlobal;
}

function hasTauriRuntime(): boolean {
  const runtime = readTauriGlobal();
  return Boolean(
    runtime.__TAURI_INTERNALS__
      || runtime.__TAURI__?.core?.invoke,
  );
}

function resolveTauriWindow() {
  return readTauriGlobal().__TAURI__?.window?.getCurrentWindow?.();
}

const browserSafeTauriTransport: SdkworkTauriTransport = {
  available: hasTauriRuntime,
  invoke: async (command, payload) => {
    const invoke = readTauriGlobal().__TAURI__?.core?.invoke;
    if (!invoke) {
      throw new Error('Tauri invoke bridge is unavailable.');
    }
    return invoke(command, payload);
  },
  listen: async (event, listener) => {
    const listen = readTauriGlobal().__TAURI__?.event?.listen;
    if (!listen) {
      throw new Error('Tauri event bridge is unavailable.');
    }
    return listen(event, listener);
  },
  window: {
    close: async () => resolveTauriWindow()?.close?.(),
    hide: async () => resolveTauriWindow()?.hide?.(),
    isMaximized: async () => Boolean(await resolveTauriWindow()?.isMaximized?.()),
    maximize: async () => resolveTauriWindow()?.maximize?.(),
    minimize: async () => resolveTauriWindow()?.minimize?.(),
    show: async () => resolveTauriWindow()?.show?.(),
    unmaximize: async () => resolveTauriWindow()?.unmaximize?.(),
  },
};

export const clawRouterTauriAuthHostBridge = createTauriHostBridge({
  descriptor: {
    id: 'claw-router-auth-tauri-host',
    label: 'Claw Router Auth Tauri Host',
    windowChrome: {
      decorations: true,
      dragRegion: false,
      startupReveal: 'immediate',
      windowControls: 'native',
    },
  },
  transport: browserSafeTauriTransport,
});

export const clawRouterTauriAuthHostReadiness = evaluateTauriHostBridgeReadiness(
  clawRouterTauriAuthHostBridge,
  {
    requiredCapabilities: ['theme-sync'],
  },
);

export const clawRouterTauriAuthHostPackageMeta = hostTauriPackageMeta;
