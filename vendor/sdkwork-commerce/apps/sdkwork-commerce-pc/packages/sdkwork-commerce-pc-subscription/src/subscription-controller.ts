import {
  useMemo,
  useSyncExternalStore,
} from "react";
import { resolveSdkworkUserCouponRequestId } from "@sdkwork/commerce-pc-coupon";
import {
  estimateSdkworkSubscriptionCheckout,
  resolveSdkworkSubscriptionPaymentMethod,
  resolveSdkworkSubscriptionPaymentMethodOption,
  type SdkworkSubscriptionAction,
  type SdkworkSubscriptionCheckoutEstimate,
  type SdkworkSubscriptionPaymentMethodOption,
  type SdkworkSubscriptionStage,
} from "./subscription";
import {
  createSdkworkSubscriptionMessages,
  type SdkworkSubscriptionMessagesOverrides,
} from "./subscription-copy";
import {
  createSdkworkSubscriptionService,
  type SdkworkSubscriptionCoupon,
  type SdkworkSubscriptionDashboardData,
  type SdkworkSubscriptionPurchaseResult,
  type SdkworkSubscriptionService,
} from "./subscription-service";

type SdkworkSubscriptionCouponSelectionMode = "auto" | "manual" | "none";

export interface SdkworkSubscriptionControllerState {
  activeAction: SdkworkSubscriptionAction;
  activeStage: SdkworkSubscriptionStage;
  checkout: SdkworkSubscriptionCheckoutEstimate;
  couponSelectionMode: SdkworkSubscriptionCouponSelectionMode;
  dashboard: SdkworkSubscriptionDashboardData;
  isBootstrapped: boolean;
  isLoading: boolean;
  isMutating: boolean;
  lastError?: string;
  selectedCouponId: string | null;
  selectedPackageId: number | null;
  selectedPaymentMethodId: string | null;
}

export interface SdkworkSubscriptionController {
  bootstrap(): Promise<SdkworkSubscriptionControllerState>;
  clearCoupon(): void;
  getState(): SdkworkSubscriptionControllerState;
  refresh(): Promise<SdkworkSubscriptionControllerState>;
  selectCoupon(couponId: string | null): void;
  selectPackage(packageId: number): void;
  selectPaymentMethod(paymentMethodId: string): void;
  service: SdkworkSubscriptionService;
  setAction(action: SdkworkSubscriptionAction): void;
  setStage(stage: SdkworkSubscriptionStage): void;
  submitCheckout(): Promise<SdkworkSubscriptionPurchaseResult>;
  subscribe(listener: () => void): () => void;
}

export interface CreateSdkworkSubscriptionControllerOptions {
  initialState?: Partial<SdkworkSubscriptionControllerState>;
  locale?: string | null;
  messages?: SdkworkSubscriptionMessagesOverrides;
  service?: Partial<SdkworkSubscriptionService>;
}

function findSelectedPlan(
  dashboard: SdkworkSubscriptionDashboardData,
  selectedPackageId: number | null,
) {
  return dashboard.plans.find((plan) => plan.packageId === selectedPackageId) ?? null;
}

function findSelectedCoupon(
  dashboard: SdkworkSubscriptionDashboardData,
  selectedCouponId: string | null,
): SdkworkSubscriptionCoupon | null {
  return dashboard.coupons.find((coupon) => coupon.id === selectedCouponId) ?? null;
}

function findSelectedPaymentMethod(
  dashboard: SdkworkSubscriptionDashboardData,
  selectedPaymentMethodId: string | null,
): SdkworkSubscriptionPaymentMethodOption | null {
  return resolveSdkworkSubscriptionPaymentMethodOption(
    dashboard.paymentMethods,
    selectedPaymentMethodId,
  );
}

function resolveSelectedPackId(
  dashboard: SdkworkSubscriptionDashboardData,
  selectedPackageId: number | null,
): number | null {
  if (selectedPackageId && dashboard.plans.some((plan) => plan.packageId === selectedPackageId)) {
    return selectedPackageId;
  }

  return dashboard.checkout.selectedPackageId
    ?? dashboard.plans.find((plan) => plan.recommended)?.packageId
    ?? dashboard.plans[0]?.packageId
    ?? null;
}

function resolveCouponSelection(
  dashboard: SdkworkSubscriptionDashboardData,
  selectedCouponId: string | null,
  couponSelectionMode: SdkworkSubscriptionCouponSelectionMode,
): {
  couponSelectionMode: SdkworkSubscriptionCouponSelectionMode;
  selectedCouponId: string | null;
} {
  if (couponSelectionMode === "none") {
    return {
      couponSelectionMode: "none",
      selectedCouponId: null,
    };
  }

  if (couponSelectionMode === "manual" && selectedCouponId && dashboard.coupons.some((coupon) => coupon.id === selectedCouponId)) {
    return {
      couponSelectionMode: "manual",
      selectedCouponId,
    };
  }

  return {
    couponSelectionMode: "auto",
    selectedCouponId: dashboard.checkout.selectedCouponId
      ?? dashboard.coupons.find((coupon) => coupon.status === "available")?.id
      ?? null,
  };
}

function resolveSelectedPaymentMethodId(
  dashboard: SdkworkSubscriptionDashboardData,
  selectedPaymentMethodId: string | null,
): string | null {
  return findSelectedPaymentMethod(dashboard, selectedPaymentMethodId)?.id
    ?? findSelectedPaymentMethod(dashboard, dashboard.checkout.selectedPaymentMethodId)?.id
    ?? null;
}

function resolveRequestCouponId(
  dashboard: SdkworkSubscriptionDashboardData,
  selectedCouponId: string | null,
): string | undefined {
  const coupon = findSelectedCoupon(dashboard, selectedCouponId);
  return coupon ? resolveSdkworkUserCouponRequestId(coupon) : undefined;
}

function resolveCheckout(
  dashboard: SdkworkSubscriptionDashboardData,
  activeAction: SdkworkSubscriptionAction,
  selectedPackageId: number | null,
  selectedCouponId: string | null,
  selectedPaymentMethodId: string | null,
): SdkworkSubscriptionCheckoutEstimate {
  const selectedPaymentMethod = findSelectedPaymentMethod(dashboard, selectedPaymentMethodId);

  return estimateSdkworkSubscriptionCheckout({
    action: activeAction,
    coupon: findSelectedCoupon(dashboard, selectedCouponId),
    paymentMethodCode: selectedPaymentMethod?.code ?? null,
    paymentMethodId: selectedPaymentMethod?.id ?? null,
    plan: findSelectedPlan(dashboard, selectedPackageId),
  });
}

function normalizeState(state: SdkworkSubscriptionControllerState): SdkworkSubscriptionControllerState {
  const selectedPackageId = resolveSelectedPackId(state.dashboard, state.selectedPackageId);
  const couponSelection = resolveCouponSelection(
    state.dashboard,
    state.selectedCouponId,
    state.couponSelectionMode,
  );
  const selectedPaymentMethodId = resolveSelectedPaymentMethodId(
    state.dashboard,
    state.selectedPaymentMethodId,
  );
  const activeStage = selectedPackageId ? state.activeStage : "plans";

  return {
    ...state,
    activeStage,
    couponSelectionMode: couponSelection.couponSelectionMode,
    checkout: resolveCheckout(
      state.dashboard,
      state.activeAction,
      selectedPackageId,
      couponSelection.selectedCouponId,
      selectedPaymentMethodId,
    ),
    selectedCouponId: couponSelection.selectedCouponId,
    selectedPackageId,
    selectedPaymentMethodId,
  };
}

function resolvePackId(
  state: SdkworkSubscriptionControllerState,
  selectPlanBeforeContinueMessage: string,
): number {
  if (!state.selectedPackageId) {
    throw new Error(selectPlanBeforeContinueMessage);
  }

  return state.selectedPackageId;
}

export function createSdkworkSubscriptionController(
  options: CreateSdkworkSubscriptionControllerOptions = {},
): SdkworkSubscriptionController {
  const copy = createSdkworkSubscriptionMessages(options.locale, options.messages);
  const fallbackDashboard = (
    options.service?.getEmptyDashboard
    ?? createSdkworkSubscriptionService({
      ...(options.locale ? { locale: options.locale } : {}),
      ...(options.messages ? { messages: options.messages } : {}),
    }).getEmptyDashboard
  )();
  const service: SdkworkSubscriptionService = options.service
    ? {
        ...createSdkworkSubscriptionService({
          ...(options.locale ? { locale: options.locale } : {}),
          ...(options.messages ? { messages: options.messages } : {}),
        }),
        ...options.service,
      }
    : createSdkworkSubscriptionService({
      ...(options.locale ? { locale: options.locale } : {}),
      ...(options.messages ? { messages: options.messages } : {}),
    });
  const listeners = new Set<() => void>();
  let state = normalizeState({
    activeAction: fallbackDashboard.checkout.action,
    activeStage: "plans",
    checkout: fallbackDashboard.checkout,
    couponSelectionMode: "auto",
    dashboard: fallbackDashboard,
    isBootstrapped: false,
    isLoading: false,
    isMutating: false,
    selectedCouponId: fallbackDashboard.checkout.selectedCouponId,
    selectedPackageId: fallbackDashboard.checkout.selectedPackageId,
    selectedPaymentMethodId: fallbackDashboard.checkout.selectedPaymentMethodId,
    ...options.initialState,
  });

  function emit(): void {
    listeners.forEach((listener) => listener());
  }

  function setState(
    next:
      | Partial<SdkworkSubscriptionControllerState>
      | ((currentState: SdkworkSubscriptionControllerState) => Partial<SdkworkSubscriptionControllerState>),
  ): void {
    const partial = typeof next === "function" ? next(state) : next;
    state = normalizeState({
      ...state,
      ...partial,
    });
    emit();
  }

  function applyDashboard(
    dashboard: SdkworkSubscriptionDashboardData,
    options: {
      preserveAction?: boolean;
      preserveSelections?: boolean;
    } = {},
  ): void {
    setState((currentState) => ({
      activeAction: options.preserveAction ? currentState.activeAction : dashboard.checkout.action,
      dashboard,
      isBootstrapped: true,
      isLoading: false,
      isMutating: false,
      selectedCouponId: options.preserveSelections ? currentState.selectedCouponId : dashboard.checkout.selectedCouponId,
      couponSelectionMode: options.preserveSelections ? currentState.couponSelectionMode : "auto",
      selectedPackageId: options.preserveSelections ? currentState.selectedPackageId : dashboard.checkout.selectedPackageId,
      selectedPaymentMethodId: options.preserveSelections
        ? currentState.selectedPaymentMethodId
        : dashboard.checkout.selectedPaymentMethodId,
    }));
  }

  return {
    async bootstrap() {
      setState({
        isLoading: true,
        lastError: undefined,
      });

      try {
        const dashboard = await service.getDashboard();
        applyDashboard(dashboard);
        return state;
      } catch (error) {
        setState({
          isLoading: false,
          lastError: error instanceof Error ? error.message : copy.service.loadDashboardFailed,
        });
        throw error;
      }
    },

    clearCoupon() {
      setState({
        couponSelectionMode: "none",
        selectedCouponId: null,
      });
    },

    getState() {
      return state;
    },

    async refresh() {
      setState({
        isLoading: true,
        lastError: undefined,
      });

      try {
        const dashboard = await service.getDashboard();
        applyDashboard(dashboard, {
          preserveAction: true,
          preserveSelections: true,
        });
        return state;
      } catch (error) {
        setState({
          isLoading: false,
          lastError: error instanceof Error ? error.message : copy.service.loadDashboardFailed,
        });
        throw error;
      }
    },

    selectCoupon(couponId) {
      setState({
        couponSelectionMode: couponId ? "manual" : "none",
        selectedCouponId: couponId,
      });
    },

    selectPackage(packageId) {
      setState({
        selectedPackageId: packageId,
      });
    },

    selectPaymentMethod(paymentMethodId) {
      setState({
        selectedPaymentMethodId: paymentMethodId,
      });
    },

    service,

    setAction(action) {
      setState({
        activeAction: action,
      });
    },

    setStage(stage) {
      setState({
        activeStage: stage,
      });
    },

    async submitCheckout() {
      const packageId = resolvePackId(state, copy.service.selectPlanBeforeContinue);
      setState({
        isMutating: true,
        lastError: undefined,
      });

      try {
        const selectedPaymentMethod = findSelectedPaymentMethod(
          state.dashboard,
          state.selectedPaymentMethodId,
        );
        const input = {
          couponId: resolveRequestCouponId(state.dashboard, state.selectedCouponId),
          packageId,
          paymentMethod: resolveSdkworkSubscriptionPaymentMethod(selectedPaymentMethod?.code ?? null) ?? undefined,
        };
        const result = state.activeAction === "purchase"
          ? await service.purchaseSubscription(input)
          : state.activeAction === "renew"
            ? await service.renewSubscription(input)
            : await service.upgradeSubscription(input);
        const dashboard = await service.getDashboard();
        applyDashboard(dashboard, {
          preserveAction: true,
          preserveSelections: true,
        });
        return result;
      } catch (error) {
        setState({
          isMutating: false,
          lastError: error instanceof Error ? error.message : copy.service.checkoutFailed,
        });
        throw error;
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useSdkworkSubscriptionController(
  controller?: SdkworkSubscriptionController,
  options?: Pick<CreateSdkworkSubscriptionControllerOptions, "locale" | "messages" | "service">,
): SdkworkSubscriptionController {
  const locale = options?.locale;
  const messages = options?.messages;
  const service = options?.service;

  return useMemo(
    () => controller ?? createSdkworkSubscriptionController({
      ...(locale ? { locale } : {}),
      ...(messages ? { messages } : {}),
      ...(service ? { service } : {}),
    }),
    [controller, locale, messages, service],
  );
}

export function useSdkworkSubscriptionControllerState(
  controller: SdkworkSubscriptionController,
): SdkworkSubscriptionControllerState {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
}
