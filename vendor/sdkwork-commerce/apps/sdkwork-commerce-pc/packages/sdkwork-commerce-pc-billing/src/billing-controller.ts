import {
  useMemo,
  useSyncExternalStore,
} from "react";
import type {
  SdkworkBillingBreakdownKey,
  SdkworkBillingBreakdownRow,
  SdkworkBillingTab,
  SdkworkBillingUsageRecord,
} from "./billing";
import {
  createSdkworkBillingMessages,
  type SdkworkBillingMessagesOverrides,
} from "./billing-copy";
import {
  createSdkworkBillingService,
  type SdkworkBillingDashboardData,
  type SdkworkBillingService,
} from "./billing-service";

export interface SdkworkBillingControllerState {
  activeBreakdown: SdkworkBillingBreakdownKey;
  activeTab: SdkworkBillingTab;
  dashboard: SdkworkBillingDashboardData;
  isBootstrapped: boolean;
  isLoading: boolean;
  lastError?: string;
  selectedBreakdown: SdkworkBillingBreakdownRow | null;
  selectedBreakdownId: string | null;
  visibleUsage: SdkworkBillingUsageRecord[];
}

export interface SdkworkBillingController {
  bootstrap(): Promise<SdkworkBillingControllerState>;
  getState(): SdkworkBillingControllerState;
  refresh(): Promise<SdkworkBillingControllerState>;
  selectBreakdown(breakdownId: string | null): void;
  service: SdkworkBillingService;
  setBreakdown(breakdown: SdkworkBillingBreakdownKey): void;
  setTab(tab: SdkworkBillingTab): void;
  subscribe(listener: () => void): () => void;
}

export interface CreateSdkworkBillingControllerOptions {
  initialState?: Partial<SdkworkBillingControllerState>;
  locale?: string | null;
  messages?: SdkworkBillingMessagesOverrides;
  service?: Partial<SdkworkBillingService>;
}

function normalizeDashboard(
  dashboard: SdkworkBillingDashboardData | undefined,
  fallbackDashboard: SdkworkBillingDashboardData,
): SdkworkBillingDashboardData {
  const resolvedDashboard = dashboard ?? fallbackDashboard;

  return {
    ...fallbackDashboard,
    ...resolvedDashboard,
    alerts: [...(resolvedDashboard.alerts ?? fallbackDashboard.alerts ?? [])],
    breakdowns: {
      capability: [...(resolvedDashboard.breakdowns?.capability ?? fallbackDashboard.breakdowns.capability)],
      model: [...(resolvedDashboard.breakdowns?.model ?? fallbackDashboard.breakdowns.model)],
      provider: [...(resolvedDashboard.breakdowns?.provider ?? fallbackDashboard.breakdowns.provider)],
      workspace: [...(resolvedDashboard.breakdowns?.workspace ?? fallbackDashboard.breakdowns.workspace)],
    },
    digest: resolvedDashboard.digest ?? fallbackDashboard.digest,
    invoiceAttention: resolvedDashboard.invoiceAttention ?? fallbackDashboard.invoiceAttention,
    paymentAttention: resolvedDashboard.paymentAttention ?? fallbackDashboard.paymentAttention,
    recentUsage: [...(resolvedDashboard.recentUsage ?? fallbackDashboard.recentUsage ?? [])],
    summary: resolvedDashboard.summary ?? fallbackDashboard.summary,
    topAction: resolvedDashboard.topAction ?? fallbackDashboard.topAction,
  };
}

function getActiveRows(
  dashboard: SdkworkBillingDashboardData,
  activeBreakdown: SdkworkBillingBreakdownKey,
): SdkworkBillingBreakdownRow[] {
  return dashboard.breakdowns[activeBreakdown] ?? [];
}

function resolveSelectedBreakdownId(
  rows: readonly SdkworkBillingBreakdownRow[],
  selectedBreakdownId: string | null,
): string | null {
  if (selectedBreakdownId && rows.some((row) => row.id === selectedBreakdownId)) {
    return selectedBreakdownId;
  }

  return rows[0]?.id ?? null;
}

function deriveVisibleUsage(
  dashboard: SdkworkBillingDashboardData,
  activeBreakdown: SdkworkBillingBreakdownKey,
  selectedBreakdownId: string | null,
): SdkworkBillingUsageRecord[] {
  if (!selectedBreakdownId) {
    return dashboard.recentUsage;
  }

  return dashboard.recentUsage.filter((record) => {
    if (activeBreakdown === "provider") {
      return record.provider === selectedBreakdownId;
    }

    if (activeBreakdown === "model") {
      return record.model === selectedBreakdownId;
    }

    if (activeBreakdown === "capability") {
      return record.capability === selectedBreakdownId;
    }

    return record.workspace === selectedBreakdownId;
  });
}

function normalizeState(
  state: SdkworkBillingControllerState,
  fallbackDashboard: SdkworkBillingDashboardData,
): SdkworkBillingControllerState {
  const dashboard = normalizeDashboard(state.dashboard, fallbackDashboard);
  const rows = getActiveRows(dashboard, state.activeBreakdown);
  const selectedBreakdownId = resolveSelectedBreakdownId(rows, state.selectedBreakdownId);

  return {
    ...state,
    dashboard,
    selectedBreakdown: rows.find((row) => row.id === selectedBreakdownId) ?? null,
    selectedBreakdownId,
    visibleUsage: deriveVisibleUsage(dashboard, state.activeBreakdown, selectedBreakdownId),
  };
}

export function createSdkworkBillingController(
  options: CreateSdkworkBillingControllerOptions = {},
): SdkworkBillingController {
  const copy = createSdkworkBillingMessages(options.locale, options.messages).controller;
  const fallbackDashboard = (
    options.service?.getEmptyDashboard
    ?? createSdkworkBillingService({
      locale: options.locale,
      messages: options.messages,
    }).getEmptyDashboard
  )();
  const service: SdkworkBillingService = options.service
    ? {
        ...createSdkworkBillingService({
          locale: options.locale,
          messages: options.messages,
        }),
        ...options.service,
      }
    : createSdkworkBillingService({
        locale: options.locale,
        messages: options.messages,
      });
  const listeners = new Set<() => void>();
  let state = normalizeState({
    activeBreakdown: "provider",
    activeTab: "overview",
    dashboard: fallbackDashboard,
    isBootstrapped: false,
    isLoading: false,
    selectedBreakdown: fallbackDashboard.breakdowns.provider[0] ?? null,
    selectedBreakdownId: fallbackDashboard.breakdowns.provider[0]?.id ?? null,
    visibleUsage: fallbackDashboard.recentUsage,
    ...options.initialState,
  }, fallbackDashboard);

  function emit(): void {
    listeners.forEach((listener) => listener());
  }

  function setState(
    next:
      | Partial<SdkworkBillingControllerState>
      | ((currentState: SdkworkBillingControllerState) => Partial<SdkworkBillingControllerState>),
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

    selectBreakdown(breakdownId) {
      setState({
        selectedBreakdownId: breakdownId,
      });
    },

    service,

    setBreakdown(breakdown) {
      setState({
        activeBreakdown: breakdown,
        selectedBreakdownId: null,
      });
    },

    setTab(tab) {
      setState({
        activeTab: tab,
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

export function useSdkworkBillingController(
  controller?: SdkworkBillingController,
  options?: Pick<CreateSdkworkBillingControllerOptions, "locale" | "messages" | "service">,
): SdkworkBillingController {
  return useMemo(
    () => controller ?? createSdkworkBillingController({
      ...(options?.locale ? { locale: options.locale } : {}),
      ...(options?.messages ? { messages: options.messages } : {}),
      ...(options?.service ? { service: options.service } : {}),
    }),
    [controller, options?.locale, options?.messages, options?.service],
  );
}

export function useSdkworkBillingControllerState(
  controller: SdkworkBillingController,
): SdkworkBillingControllerState {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
}
