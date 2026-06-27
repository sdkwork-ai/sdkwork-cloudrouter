import {
  useMemo,
  useSyncExternalStore,
} from "react";
import type { SdkworkCommerceMessagesOverrides } from "./commerce-copy";
import {
  createSdkworkCommerceService,
  type SdkworkCommerceHubService,
  type SdkworkCommerceSnapshot,
} from "./commerce-service";

export interface SdkworkCommerceControllerState {
  isBootstrapped: boolean;
  isLoading: boolean;
  lastError?: string;
  snapshot: SdkworkCommerceSnapshot;
}

export interface SdkworkCommerceController {
  bootstrap(): Promise<SdkworkCommerceControllerState>;
  getState(): SdkworkCommerceControllerState;
  refresh(): Promise<SdkworkCommerceControllerState>;
  service: SdkworkCommerceHubService;
  subscribe(listener: () => void): () => void;
}

export interface CreateSdkworkCommerceControllerOptions {
  initialState?: Partial<SdkworkCommerceControllerState>;
  locale?: string | null;
  messages?: SdkworkCommerceMessagesOverrides;
  service?: Partial<SdkworkCommerceHubService>;
}

export function createSdkworkCommerceController(
  options: CreateSdkworkCommerceControllerOptions = {},
): SdkworkCommerceController {
  const baseService = createSdkworkCommerceService({
    locale: options.locale,
    messages: options.messages,
  });
  const service: SdkworkCommerceHubService = options.service
    ? {
        ...baseService,
        ...options.service,
      }
    : baseService;
  const listeners = new Set<() => void>();
  let state: SdkworkCommerceControllerState = {
    isBootstrapped: false,
    isLoading: false,
    snapshot: service.getEmptySnapshot(),
    ...options.initialState,
  };

  function emit(): void {
    listeners.forEach((listener) => listener());
  }

  function setState(
    next:
      | Partial<SdkworkCommerceControllerState>
      | ((currentState: SdkworkCommerceControllerState) => Partial<SdkworkCommerceControllerState>),
  ): void {
    const partial = typeof next === "function" ? next(state) : next;
    state = {
      ...state,
      ...partial,
    };
    emit();
  }

  async function loadSnapshot(): Promise<SdkworkCommerceSnapshot> {
    return service.getSnapshot();
  }

  return {
    async bootstrap() {
      setState({
        isLoading: true,
        lastError: undefined,
      });

      try {
        const snapshot = await loadSnapshot();
        setState({
          isBootstrapped: true,
          isLoading: false,
          snapshot,
        });
        return state;
      } catch (error) {
        setState({
          isLoading: false,
          lastError: error instanceof Error ? error.message : "Failed to load commerce hub.",
        });
        throw error;
      }
    },

    getState() {
      return state;
    },

    async refresh() {
      const snapshot = await loadSnapshot();
      setState({
        isBootstrapped: true,
        isLoading: false,
        snapshot,
      });
      return state;
    },

    service,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useSdkworkCommerceController(
  controller?: SdkworkCommerceController,
  options?: CreateSdkworkCommerceControllerOptions,
): SdkworkCommerceController {
  return useMemo(
    () => controller ?? createSdkworkCommerceController(options),
    [controller, options],
  );
}

export function useSdkworkCommerceControllerState(
  controller: SdkworkCommerceController,
): SdkworkCommerceControllerState {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
}
