import {
  useMemo,
  useSyncExternalStore,
} from "react";
import type {
  SdkworkEntitlementDashboardData,
  SdkworkEntitlementDecision,
  SdkworkEntitlementFilter,
} from "./entitlement";
import {
  createSdkworkEntitlementMessages,
  type SdkworkEntitlementMessagesOverrides,
} from "./entitlement-copy";
import {
  createSdkworkEntitlementService,
  type SdkworkEntitlementService,
} from "./entitlement-service";

export interface SdkworkEntitlementControllerState {
  activeFilter: SdkworkEntitlementFilter;
  dashboard: SdkworkEntitlementDashboardData;
  isBootstrapped: boolean;
  isLoading: boolean;
  lastError?: string;
  selectedCapability: SdkworkEntitlementDecision | null;
  selectedCapabilityId: string | null;
  visibleDecisions: SdkworkEntitlementDecision[];
}

export interface SdkworkEntitlementController {
  bootstrap(): Promise<SdkworkEntitlementControllerState>;
  getState(): SdkworkEntitlementControllerState;
  refresh(): Promise<SdkworkEntitlementControllerState>;
  selectCapability(capabilityId: string | null): void;
  service: SdkworkEntitlementService;
  setFilter(filter: SdkworkEntitlementFilter): void;
  subscribe(listener: () => void): () => void;
}

export interface CreateSdkworkEntitlementControllerOptions {
  initialState?: Partial<SdkworkEntitlementControllerState>;
  locale?: string | null;
  messages?: SdkworkEntitlementMessagesOverrides;
  service?: Partial<SdkworkEntitlementService>;
}

function normalizeDashboard(
  dashboard: SdkworkEntitlementDashboardData | undefined,
  fallbackDashboard: SdkworkEntitlementDashboardData,
): SdkworkEntitlementDashboardData {
  const resolvedDashboard = dashboard ?? fallbackDashboard;

  return {
    ...fallbackDashboard,
    ...resolvedDashboard,
    decisions: [...(resolvedDashboard.decisions ?? fallbackDashboard.decisions ?? [])],
    digest: resolvedDashboard.digest ?? fallbackDashboard.digest,
    inventory: resolvedDashboard.inventory ?? fallbackDashboard.inventory,
    topAction: resolvedDashboard.topAction ?? fallbackDashboard.topAction,
  };
}

function deriveVisibleDecisions(
  dashboard: SdkworkEntitlementDashboardData,
  filter: SdkworkEntitlementFilter,
): SdkworkEntitlementDecision[] {
  if (filter === "all") {
    return dashboard.decisions;
  }

  if (filter === "attention") {
    return dashboard.decisions.filter((decision) => decision.status !== "ready");
  }

  return dashboard.decisions.filter((decision) => decision.status === filter);
}

function resolveSelectedCapabilityId(
  visibleDecisions: readonly SdkworkEntitlementDecision[],
  selectedCapabilityId: string | null,
): string | null {
  if (selectedCapabilityId && visibleDecisions.some((decision) => decision.id === selectedCapabilityId)) {
    return selectedCapabilityId;
  }

  return visibleDecisions[0]?.id ?? null;
}

function normalizeState(
  state: SdkworkEntitlementControllerState,
  fallbackDashboard: SdkworkEntitlementDashboardData,
): SdkworkEntitlementControllerState {
  const dashboard = normalizeDashboard(state.dashboard, fallbackDashboard);
  const visibleDecisions = deriveVisibleDecisions(dashboard, state.activeFilter);
  const selectedCapabilityId = resolveSelectedCapabilityId(visibleDecisions, state.selectedCapabilityId);

  return {
    ...state,
    dashboard,
    selectedCapability: visibleDecisions.find((decision) => decision.id === selectedCapabilityId) ?? null,
    selectedCapabilityId,
    visibleDecisions,
  };
}

export function createSdkworkEntitlementController(
  options: CreateSdkworkEntitlementControllerOptions = {},
): SdkworkEntitlementController {
  const copy = createSdkworkEntitlementMessages(options.locale, options.messages).controller;
  const serviceFactoryOptions = {
    locale: options.locale,
    messages: options.messages,
  };
  const fallbackDashboard = (
    options.service?.getEmptyDashboard
    ?? createSdkworkEntitlementService(serviceFactoryOptions).getEmptyDashboard
  )();
  const service: SdkworkEntitlementService = options.service
    ? {
      ...createSdkworkEntitlementService(serviceFactoryOptions),
      ...options.service,
    }
    : createSdkworkEntitlementService(serviceFactoryOptions);
  const listeners = new Set<() => void>();
  let state = normalizeState({
    activeFilter: "all",
    dashboard: fallbackDashboard,
    isBootstrapped: false,
    isLoading: false,
    selectedCapability: fallbackDashboard.decisions[0] ?? null,
    selectedCapabilityId: fallbackDashboard.decisions[0]?.id ?? null,
    visibleDecisions: fallbackDashboard.decisions,
    ...options.initialState,
  }, fallbackDashboard);

  function emit(): void {
    listeners.forEach((listener) => listener());
  }

  function setState(
    next:
      | Partial<SdkworkEntitlementControllerState>
      | ((currentState: SdkworkEntitlementControllerState) => Partial<SdkworkEntitlementControllerState>),
  ): void {
    const partial = typeof next === "function" ? next(state) : next;
    state = normalizeState({
      ...state,
      ...partial,
    }, fallbackDashboard);
    emit();
  }

  return {
    async bootstrap() {
      setState({
        isLoading: true,
        lastError: undefined,
      });

      try {
        const dashboard = await service.getDashboard();
        setState({
          dashboard,
          isBootstrapped: true,
          isLoading: false,
        });
        return state;
      } catch (error) {
        setState({
          isLoading: false,
          lastError: error instanceof Error ? error.message : copy.bootstrapFailed,
        });
        throw error;
      }
    },

    getState() {
      return state;
    },

    async refresh() {
      const dashboard = await service.getDashboard();
      setState({
        dashboard,
        isBootstrapped: true,
        isLoading: false,
      });
      return state;
    },

    selectCapability(capabilityId) {
      setState({
        selectedCapabilityId: capabilityId,
      });
    },

    service,

    setFilter(filter) {
      setState({
        activeFilter: filter,
      });
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useSdkworkEntitlementController(
  controller?: SdkworkEntitlementController,
  options?: Pick<CreateSdkworkEntitlementControllerOptions, "locale" | "messages" | "service">,
): SdkworkEntitlementController {
  return useMemo(
    () => controller ?? createSdkworkEntitlementController({
      ...(options?.locale ? { locale: options.locale } : {}),
      ...(options?.messages ? { messages: options.messages } : {}),
      ...(options?.service ? { service: options.service } : {}),
    }),
    [controller, options?.locale, options?.messages, options?.service],
  );
}

export function useSdkworkEntitlementControllerState(
  controller: SdkworkEntitlementController,
): SdkworkEntitlementControllerState {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
}
