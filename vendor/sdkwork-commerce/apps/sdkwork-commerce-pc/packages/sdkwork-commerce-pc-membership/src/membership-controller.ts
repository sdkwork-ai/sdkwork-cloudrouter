import {
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  createSdkworkMembershipService,
  type SdkworkMembershipDashboardData,
  type SdkworkMembershipMutationInput,
  type SdkworkMembershipPurchaseResult,
  type SdkworkMembershipService,
} from "./membership-service";

export type SdkworkMembershipView = "benefits" | "levels" | "plans";

export interface SdkworkMembershipControllerState {
  activeView: SdkworkMembershipView;
  dashboard: SdkworkMembershipDashboardData;
  isBootstrapped: boolean;
  isLoading: boolean;
  isMutating: boolean;
  lastError?: string;
  selectedPlanId: number | null;
}

export interface SdkworkMembershipController {
  bootstrap(): Promise<SdkworkMembershipControllerState>;
  getState(): SdkworkMembershipControllerState;
  purchaseSelectedPlan(input?: Omit<SdkworkMembershipMutationInput, "packageId"> & { packageId?: number }): Promise<SdkworkMembershipPurchaseResult>;
  refresh(): Promise<SdkworkMembershipControllerState>;
  renewSelectedPlan(input?: Omit<SdkworkMembershipMutationInput, "packageId"> & { packageId?: number }): Promise<SdkworkMembershipPurchaseResult>;
  selectPlan(packageId: number): void;
  service: SdkworkMembershipService;
  setView(view: SdkworkMembershipView): void;
  subscribe(listener: () => void): () => void;
  upgradeSelectedPlan(input?: Omit<SdkworkMembershipMutationInput, "packageId"> & { packageId?: number }): Promise<SdkworkMembershipPurchaseResult>;
}

export interface CreateSdkworkMembershipControllerOptions {
  initialState?: Partial<SdkworkMembershipControllerState>;
  service?: Partial<SdkworkMembershipService>;
}

function resolveSelectedPlanId(
  dashboard: SdkworkMembershipDashboardData,
  selectedPlanId: number | null,
): number | null {
  if (selectedPlanId && dashboard.plans.some((plan) => plan.packageId === selectedPlanId)) {
    return selectedPlanId;
  }

  return dashboard.plans.find((plan) => plan.recommended)?.packageId ?? dashboard.plans[0]?.packageId ?? null;
}

function resolvePlanId(
  state: SdkworkMembershipControllerState,
  input: Omit<SdkworkMembershipMutationInput, "packageId"> & { packageId?: number } = {},
): number {
  const packageId = input.packageId ?? state.selectedPlanId;
  if (!packageId) {
    throw new Error("Select a membership package before continuing.");
  }

  return packageId;
}

export function createSdkworkMembershipController(
  options: CreateSdkworkMembershipControllerOptions = {},
): SdkworkMembershipController {
  const service: SdkworkMembershipService = options.service
    ? {
        ...createSdkworkMembershipService(),
        ...options.service,
      }
    : createSdkworkMembershipService();
  const listeners = new Set<() => void>();
  let state: SdkworkMembershipControllerState = {
    activeView: "plans",
    dashboard: service.getEmptyDashboard(),
    isBootstrapped: false,
    isLoading: false,
    isMutating: false,
    selectedPlanId: null,
    ...options.initialState,
  };
  state.selectedPlanId = resolveSelectedPlanId(state.dashboard, state.selectedPlanId);
  let bootstrapPromise: Promise<SdkworkMembershipControllerState> | null = null;

  function emit(): void {
    listeners.forEach((listener) => listener());
  }

  function setState(
    next:
      | Partial<SdkworkMembershipControllerState>
      | ((currentState: SdkworkMembershipControllerState) => Partial<SdkworkMembershipControllerState>),
  ): void {
    const partial = typeof next === "function" ? next(state) : next;
    state = {
      ...state,
      ...partial,
    };
    state.selectedPlanId = resolveSelectedPlanId(state.dashboard, state.selectedPlanId);
    emit();
  }

  async function loadDashboard(): Promise<SdkworkMembershipDashboardData> {
    return service.getDashboard();
  }

  async function runMutation(
    callback: (packageId: number) => Promise<SdkworkMembershipPurchaseResult>,
    input?: Omit<SdkworkMembershipMutationInput, "packageId"> & { packageId?: number },
  ): Promise<SdkworkMembershipPurchaseResult> {
    const packageId = resolvePlanId(state, input);
    setState({
      isMutating: true,
      lastError: undefined,
      selectedPlanId: packageId,
    });

    try {
      const result = await callback(packageId);
      const dashboard = await loadDashboard();
      setState({
        dashboard,
        isBootstrapped: true,
        isMutating: false,
      });
      return result;
    } catch (error) {
      setState({
        isMutating: false,
        lastError: error instanceof Error ? error.message : "Membership request failed.",
      });
      throw error;
    }
  }

  return {
    async bootstrap() {
      if (bootstrapPromise) {
        return bootstrapPromise;
      }

      setState({
        isLoading: true,
        lastError: undefined,
      });

      bootstrapPromise = (async () => {
        try {
          const dashboard = await loadDashboard();
          setState({
            dashboard,
            isBootstrapped: true,
            isLoading: false,
          });
          return state;
        } catch (error) {
          setState({
            isBootstrapped: true,
            isLoading: false,
            lastError: error instanceof Error ? error.message : "Failed to load membership center.",
          });
          throw error;
        } finally {
          bootstrapPromise = null;
        }
      })();

      return bootstrapPromise;
    },

    getState() {
      return state;
    },

    async purchaseSelectedPlan(input) {
      return runMutation(
        (packageId) => service.purchaseMembership({ ...input, packageId }),
        input,
      );
    },

    async refresh() {
      const dashboard = await loadDashboard();
      setState({
        dashboard,
        isBootstrapped: true,
        isLoading: false,
      });
      return state;
    },

    async renewSelectedPlan(input) {
      return runMutation(
        (packageId) => service.renewMembership({ ...input, packageId }),
        input,
      );
    },

    selectPlan(packageId) {
      setState({
        selectedPlanId: packageId,
      });
    },

    service,

    setView(view) {
      setState({
        activeView: view,
      });
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async upgradeSelectedPlan(input) {
      return runMutation(
        (packageId) => service.upgradeMembership({ ...input, packageId }),
        input,
      );
    },
  };
}

export function useSdkworkMembershipController(
  controller?: SdkworkMembershipController,
): SdkworkMembershipController {
  return useMemo(() => controller ?? createSdkworkMembershipController(), [controller]);
}

export function useSdkworkMembershipControllerState(
  controller: SdkworkMembershipController,
): SdkworkMembershipControllerState {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
}
