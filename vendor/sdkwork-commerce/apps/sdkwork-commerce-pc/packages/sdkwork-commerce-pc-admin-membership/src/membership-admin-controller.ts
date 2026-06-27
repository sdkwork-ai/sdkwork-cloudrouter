import {
  useMemo,
  useSyncExternalStore,
} from "react";
import type { SdkworkMembershipAdminView } from "./membership-admin";
import {
  createSdkworkMembershipAdminService,
  type SdkworkMembershipAdminDashboardData,
  type SdkworkMembershipAdminLevel,
  type SdkworkMembershipAdminLevelDeleteResult,
  type SdkworkMembershipAdminLevelUpdateInput,
  type SdkworkMembershipAdminMembership,
  type SdkworkMembershipAdminMembershipUpdateInput,
  type SdkworkMembershipAdminPackage,
  type SdkworkMembershipAdminPackageDeleteResult,
  type SdkworkMembershipAdminPackageGroup,
  type SdkworkMembershipAdminPackageGroupDeleteResult,
  type SdkworkMembershipAdminPackageGroupMutationInput,
  type SdkworkMembershipAdminPackageUpdateInput,
  type SdkworkMembershipAdminService,
} from "./membership-admin-service";

export interface SdkworkMembershipAdminControllerState {
  activeView: SdkworkMembershipAdminView;
  dashboard: SdkworkMembershipAdminDashboardData;
  isBootstrapped: boolean;
  isLoading: boolean;
  isMutating: boolean;
  lastError?: string;
}

export interface SdkworkMembershipAdminController {
  assignPackagesToGroup(packages: SdkworkMembershipAdminPackage[], packageGroupId: string): Promise<SdkworkMembershipAdminControllerState>;
  bootstrap(): Promise<SdkworkMembershipAdminControllerState>;
  createLevel(input: SdkworkMembershipAdminLevelUpdateInput): Promise<SdkworkMembershipAdminControllerState>;
  createPackage(input: SdkworkMembershipAdminPackageUpdateInput): Promise<SdkworkMembershipAdminControllerState>;
  createPackageGroup(input: SdkworkMembershipAdminPackageGroupMutationInput): Promise<SdkworkMembershipAdminControllerState>;
  deleteLevel(levelId: string): Promise<SdkworkMembershipAdminControllerState>;
  deletePackage(packageId: string): Promise<SdkworkMembershipAdminControllerState>;
  deletePackageGroup(packageGroupId: string): Promise<SdkworkMembershipAdminControllerState>;
  getState(): SdkworkMembershipAdminControllerState;
  refresh(): Promise<SdkworkMembershipAdminControllerState>;
  service: SdkworkMembershipAdminService;
  setView(view: SdkworkMembershipAdminView): void;
  subscribe(listener: () => void): () => void;
  updateLevel(levelId: string, input: SdkworkMembershipAdminLevelUpdateInput): Promise<SdkworkMembershipAdminControllerState>;
  updateMembershipStatus(
    membershipId: string,
    input: SdkworkMembershipAdminMembershipUpdateInput,
  ): Promise<SdkworkMembershipAdminMembership>;
  updatePackage(packageId: string, input: SdkworkMembershipAdminPackageUpdateInput): Promise<SdkworkMembershipAdminControllerState>;
  updatePackageGroup(
    packageGroupId: string,
    input: SdkworkMembershipAdminPackageGroupMutationInput,
  ): Promise<SdkworkMembershipAdminControllerState>;
}

export interface CreateSdkworkMembershipAdminControllerOptions {
  initialState?: Partial<SdkworkMembershipAdminControllerState>;
  service?: Partial<SdkworkMembershipAdminService>;
}

type MutationResult =
  | SdkworkMembershipAdminControllerState
  | SdkworkMembershipAdminLevel
  | SdkworkMembershipAdminLevelDeleteResult
  | SdkworkMembershipAdminPackage
  | SdkworkMembershipAdminPackageDeleteResult
  | SdkworkMembershipAdminPackageGroup
  | SdkworkMembershipAdminPackageGroupDeleteResult
  | SdkworkMembershipAdminMembership
  | SdkworkMembershipAdminPackage[];

export function createSdkworkMembershipAdminController(
  options: CreateSdkworkMembershipAdminControllerOptions = {},
): SdkworkMembershipAdminController {
  const baseService = createSdkworkMembershipAdminService();
  const service: SdkworkMembershipAdminService = options.service
    ? {
        ...baseService,
        ...options.service,
      }
    : baseService;
  const listeners = new Set<() => void>();
  let state: SdkworkMembershipAdminControllerState = {
    activeView: "levels",
    dashboard: service.getEmptyDashboard(),
    isBootstrapped: false,
    isLoading: false,
    isMutating: false,
    ...options.initialState,
  };

  function emit(): void {
    listeners.forEach((listener) => listener());
  }

  function setState(
    next:
      | Partial<SdkworkMembershipAdminControllerState>
      | ((currentState: SdkworkMembershipAdminControllerState) => Partial<SdkworkMembershipAdminControllerState>),
  ): void {
    const partial = typeof next === "function" ? next(state) : next;
    state = {
      ...state,
      ...partial,
    };
    emit();
  }

  async function loadDashboard(): Promise<SdkworkMembershipAdminDashboardData> {
    return service.getDashboard();
  }

  async function refreshAfterMutation(): Promise<SdkworkMembershipAdminControllerState> {
    const dashboard = await loadDashboard();
    setState({
      dashboard,
      isBootstrapped: true,
      isMutating: false,
    });
    return state;
  }

  async function runMutation<T extends MutationResult>(
    operation: () => Promise<T>,
    fallbackMessage: string,
    options: { refresh?: boolean } = { refresh: true },
  ): Promise<T | SdkworkMembershipAdminControllerState> {
    setState({
      isMutating: true,
      lastError: undefined,
    });

    try {
      const result = await operation();
      if (options.refresh === false) {
        setState({
          isMutating: false,
        });
        return result;
      }
      return refreshAfterMutation();
    } catch (error) {
      setState({
        isMutating: false,
        lastError: error instanceof Error ? error.message : fallbackMessage,
      });
      throw error;
    }
  }

  return {
    async assignPackagesToGroup(packages, packageGroupId) {
      return runMutation(
        () => service.assignPackagesToGroup(packages, packageGroupId),
        "Failed to assign membership packages.",
      ) as Promise<SdkworkMembershipAdminControllerState>;
    },

    async bootstrap() {
      setState({
        isLoading: true,
        lastError: undefined,
      });

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
          isLoading: false,
          lastError: error instanceof Error ? error.message : "Failed to load membership admin.",
        });
        throw error;
      }
    },

    async createLevel(input) {
      return runMutation(
        () => service.createLevel(input),
        "Failed to create membership level.",
      ) as Promise<SdkworkMembershipAdminControllerState>;
    },

    async createPackage(input) {
      return runMutation(
        () => service.createPackage(input),
        "Failed to create membership package.",
      ) as Promise<SdkworkMembershipAdminControllerState>;
    },

    async createPackageGroup(input) {
      return runMutation(
        () => service.createPackageGroup(input),
        "Failed to create membership package group.",
      ) as Promise<SdkworkMembershipAdminControllerState>;
    },

    async deleteLevel(levelId) {
      return runMutation(
        () => service.deleteLevel(levelId),
        "Failed to delete membership level.",
      ) as Promise<SdkworkMembershipAdminControllerState>;
    },

    async deletePackage(packageId) {
      return runMutation(
        () => service.deletePackage(packageId),
        "Failed to delete membership package.",
      ) as Promise<SdkworkMembershipAdminControllerState>;
    },

    async deletePackageGroup(packageGroupId) {
      return runMutation(
        () => service.deletePackageGroup(packageGroupId),
        "Failed to delete membership package group.",
      ) as Promise<SdkworkMembershipAdminControllerState>;
    },

    getState() {
      return state;
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

    async updateLevel(levelId, input) {
      return runMutation(
        () => service.updateLevel(levelId, input),
        "Failed to update membership level.",
      ) as Promise<SdkworkMembershipAdminControllerState>;
    },

    async updateMembershipStatus(membershipId, input) {
      return runMutation(
        () => service.updateMembershipStatus(membershipId, input),
        "Failed to update membership record.",
        { refresh: false },
      ) as Promise<SdkworkMembershipAdminMembership>;
    },

    async updatePackage(packageId, input) {
      return runMutation(
        () => service.updatePackage(packageId, input),
        "Failed to update membership package.",
      ) as Promise<SdkworkMembershipAdminControllerState>;
    },

    async updatePackageGroup(packageGroupId, input) {
      return runMutation(
        () => service.updatePackageGroup(packageGroupId, input),
        "Failed to update membership package group.",
      ) as Promise<SdkworkMembershipAdminControllerState>;
    },
  };
}

export function useSdkworkMembershipAdminController(
  controller?: SdkworkMembershipAdminController,
): SdkworkMembershipAdminController {
  return useMemo(() => controller ?? createSdkworkMembershipAdminController(), [controller]);
}

export function useSdkworkMembershipAdminControllerState(
  controller: SdkworkMembershipAdminController,
): SdkworkMembershipAdminControllerState {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
}
