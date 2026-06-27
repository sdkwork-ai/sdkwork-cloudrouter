import {
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  buildSdkworkCheckoutSession,
  resolveCheckoutRouteSourceId,
  resolveCheckoutRouteWalletRecharge,
  type SdkworkCheckoutCatalogData,
  type SdkworkCheckoutSession,
} from "./checkout";
import {
  buildSdkworkCheckoutWalletRechargeSource,
  createSdkworkCheckoutService,
  type SdkworkCheckoutService,
  type SdkworkCheckoutSubmitResult,
} from "./checkout-service";
import {
  createSdkworkCheckoutMessages,
  type SdkworkCheckoutMessagesOverrides,
} from "./checkout-copy";

export interface SdkworkCheckoutControllerState {
  catalog: SdkworkCheckoutCatalogData;
  invoiceRequested?: boolean;
  isBootstrapped: boolean;
  isLoading: boolean;
  isMutating: boolean;
  lastError?: string;
  lastSubmission?: SdkworkCheckoutSubmitResult;
  selectedCouponId?: string | null;
  selectedPaymentMethodId?: string | null;
  selectedSourceId?: string | null;
  session: SdkworkCheckoutSession;
}

export interface SdkworkCheckoutController {
  bootstrap(): Promise<SdkworkCheckoutControllerState>;
  ensureRouteSource(routeSearchParams?: URLSearchParams): void;
  getState(): SdkworkCheckoutControllerState;
  refresh(): Promise<SdkworkCheckoutControllerState>;
  selectCoupon(couponId: string | null): void;
  selectPaymentMethod(paymentMethodId: string): void;
  selectSource(sourceId: string): void;
  service: SdkworkCheckoutService;
  submitCheckout(): Promise<SdkworkCheckoutSubmitResult>;
  subscribe(listener: () => void): () => void;
  toggleInvoiceRequested(requested: boolean): void;
}

export interface CreateSdkworkCheckoutControllerOptions {
  initialState?: Partial<SdkworkCheckoutControllerState>;
  locale?: string | null;
  messages?: SdkworkCheckoutMessagesOverrides;
  service?: Partial<SdkworkCheckoutService>;
}

function normalizeState(
  state: SdkworkCheckoutControllerState,
): SdkworkCheckoutControllerState {
  const session = buildSdkworkCheckoutSession({
    catalog: state.catalog,
    invoiceRequested: state.invoiceRequested,
    selectedCouponId: state.selectedCouponId,
    selectedPaymentMethodId: state.selectedPaymentMethodId,
    selectedSourceId: state.selectedSourceId,
  });

  return {
    ...state,
    invoiceRequested: session.invoiceRequested,
    selectedCouponId: session.selectedCouponId,
    selectedPaymentMethodId: session.selectedPaymentMethodId,
    selectedSourceId: session.source?.id ?? null,
    session,
  };
}

export function createSdkworkCheckoutController(
  options: CreateSdkworkCheckoutControllerOptions = {},
): SdkworkCheckoutController {
  const copy = createSdkworkCheckoutMessages(options.locale, options.messages).controller;
  const service: SdkworkCheckoutService = options.service
    ? {
        ...createSdkworkCheckoutService({
          locale: options.locale,
          messages: options.messages,
        }),
        ...options.service,
      }
    : createSdkworkCheckoutService({
        locale: options.locale,
        messages: options.messages,
      });
  const fallbackCatalog = service.getEmptyCatalog();
  const listeners = new Set<() => void>();
  let state = normalizeState({
    catalog: fallbackCatalog,
    isBootstrapped: false,
    isLoading: false,
    isMutating: false,
    session: buildSdkworkCheckoutSession({
      catalog: fallbackCatalog,
    }),
    ...options.initialState,
  });

  function emit(): void {
    listeners.forEach((listener) => listener());
  }

  function setState(
    next:
      | Partial<SdkworkCheckoutControllerState>
      | ((currentState: SdkworkCheckoutControllerState) => Partial<SdkworkCheckoutControllerState>),
  ): void {
    const partial = typeof next === "function" ? next(state) : next;
    state = normalizeState({
      ...state,
      ...partial,
    });
    emit();
  }

  return {
    async bootstrap() {
      setState({
        isLoading: true,
        lastError: undefined,
      });

      try {
        const catalog = await service.getCatalog();
        setState({
          catalog,
          isBootstrapped: true,
          isLoading: false,
          invoiceRequested: undefined,
          selectedCouponId: undefined,
          selectedSourceId: undefined,
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
      const catalog = await service.getCatalog();
      setState({
        catalog,
        isBootstrapped: true,
        isLoading: false,
      });
      return state;
    },

    ensureRouteSource(routeSearchParams) {
      if (!routeSearchParams) {
        return;
      }

      const sourceId = resolveCheckoutRouteSourceId(routeSearchParams);
      if (!sourceId) {
        return;
      }

      if (state.catalog.sources.some((source) => source.id === sourceId)) {
        if (state.selectedSourceId !== sourceId) {
          setState({
            selectedCouponId: undefined,
            selectedSourceId: sourceId,
          });
        }
        return;
      }

      const walletRecharge = resolveCheckoutRouteWalletRecharge(routeSearchParams);
      if (!walletRecharge?.points || !walletRecharge.priceCny) {
        return;
      }

      const fallbackSource = buildSdkworkCheckoutWalletRechargeSource({
        locale: options.locale,
        messages: options.messages,
        packageId: walletRecharge.packageId,
        points: walletRecharge.points,
        priceCny: walletRecharge.priceCny,
      });

      if (fallbackSource.id !== sourceId) {
        return;
      }

      setState({
        catalog: {
          ...state.catalog,
          sources: [...state.catalog.sources, fallbackSource],
        },
        selectedCouponId: undefined,
        selectedSourceId: sourceId,
      });
    },

    selectCoupon(couponId) {
      setState({
        selectedCouponId: couponId,
      });
    },

    selectPaymentMethod(paymentMethodId) {
      setState({
        selectedPaymentMethodId: paymentMethodId,
      });
    },

    selectSource(sourceId) {
      setState({
        selectedCouponId: undefined,
        selectedSourceId: sourceId,
      });
    },

    service,

    async submitCheckout() {
      if (!state.session.source) {
        throw new Error(copy.noSourceSelected);
      }

      setState({
        isMutating: true,
        lastError: undefined,
      });

      try {
        const result = await service.submitCheckout({
          invoiceRequested: state.invoiceRequested,
          selectedCouponId: state.selectedCouponId,
          selectedPaymentMethodId: state.selectedPaymentMethodId,
          sourceId: state.session.source.id,
        });
        setState({
          isMutating: false,
          lastSubmission: result,
        });
        return result;
      } catch (error) {
        setState({
          isMutating: false,
          lastError: error instanceof Error ? error.message : copy.submitFailed,
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

    toggleInvoiceRequested(requested) {
      setState({
        invoiceRequested: requested,
      });
    },
  };
}

export function useSdkworkCheckoutController(
  controller?: SdkworkCheckoutController,
  service?: Partial<SdkworkCheckoutService>,
  options?: Pick<CreateSdkworkCheckoutControllerOptions, "locale" | "messages">,
): SdkworkCheckoutController {
  return useMemo(
    () => controller ?? createSdkworkCheckoutController({
      ...(service ? { service } : {}),
      ...(options?.locale ? { locale: options.locale } : {}),
      ...(options?.messages ? { messages: options.messages } : {}),
    }),
    [controller, options?.locale, options?.messages, service],
  );
}

export function useSdkworkCheckoutControllerState(
  controller: SdkworkCheckoutController,
): SdkworkCheckoutControllerState {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
}
