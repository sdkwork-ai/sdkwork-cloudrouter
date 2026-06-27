import {
  useMemo,
  useSyncExternalStore,
} from "react";
import type { SdkworkInvoiceFilter } from "./invoice";
import {
  createSdkworkInvoiceMessages,
  type SdkworkInvoiceMessagesOverrides,
} from "./invoice-copy";
import {
  createSdkworkInvoiceService,
  type SdkworkInvoiceCancelInput,
  type SdkworkInvoiceCancelResult,
  type SdkworkInvoiceCreateInput,
  type SdkworkInvoiceDashboardData,
  type SdkworkInvoiceDetail,
  type SdkworkInvoiceMutationResult,
  type SdkworkInvoiceService,
  type SdkworkInvoiceSummary,
  type SdkworkInvoiceUpdateInput,
} from "./invoice-service";

export type SdkworkInvoiceEditorMode = "create" | "edit";

export interface SdkworkInvoiceControllerState {
  activeFilter: SdkworkInvoiceFilter;
  dashboard: SdkworkInvoiceDashboardData;
  detail?: SdkworkInvoiceDetail;
  editorMode?: SdkworkInvoiceEditorMode;
  isBootstrapped: boolean;
  isDetailLoading: boolean;
  isDetailOpen: boolean;
  isEditorOpen: boolean;
  isLoading: boolean;
  isMutating: boolean;
  lastError?: string;
  selectedInvoiceId?: string;
  visibleInvoices: SdkworkInvoiceSummary[];
}

export interface SdkworkInvoiceController {
  bootstrap(): Promise<SdkworkInvoiceControllerState>;
  cancelInvoice(input: SdkworkInvoiceCancelInput): Promise<SdkworkInvoiceCancelResult>;
  closeDetail(): void;
  closeEditor(): void;
  createInvoice(input: SdkworkInvoiceCreateInput): Promise<SdkworkInvoiceMutationResult>;
  getState(): SdkworkInvoiceControllerState;
  openCreateDialog(): void;
  openDetail(invoiceId: string): Promise<SdkworkInvoiceControllerState>;
  openEditDialog(invoiceId?: string): void;
  refresh(): Promise<SdkworkInvoiceControllerState>;
  service: SdkworkInvoiceService;
  setFilter(filter: SdkworkInvoiceFilter): void;
  submitInvoice(invoiceId: string): Promise<{ invoiceId: string; submitted: true }>;
  subscribe(listener: () => void): () => void;
  updateInvoice(input: SdkworkInvoiceUpdateInput): Promise<SdkworkInvoiceMutationResult>;
}

export interface CreateSdkworkInvoiceControllerOptions {
  initialState?: Partial<SdkworkInvoiceControllerState>;
  locale?: string | null;
  messages?: SdkworkInvoiceMessagesOverrides;
  service?: Partial<SdkworkInvoiceService>;
}

function deriveVisibleInvoices(
  dashboard: SdkworkInvoiceDashboardData,
  activeFilter: SdkworkInvoiceFilter,
): SdkworkInvoiceSummary[] {
  if (activeFilter === "all") {
    return dashboard.invoices;
  }

  if (activeFilter === "actionable") {
    return dashboard.invoices.filter((invoice) => invoice.status === "draft" || invoice.status === "failed");
  }

  return dashboard.invoices.filter((invoice) => invoice.status === activeFilter);
}

export function createSdkworkInvoiceController(
  options: CreateSdkworkInvoiceControllerOptions = {},
): SdkworkInvoiceController {
  const copy = createSdkworkInvoiceMessages(options.locale, options.messages).controller;
  const fallbackDashboard = (
    options.service?.getEmptyDashboard
    ?? createSdkworkInvoiceService({
      locale: options.locale,
      messages: options.messages,
    }).getEmptyDashboard
  )();
  const service: SdkworkInvoiceService = options.service
    ? {
        ...createSdkworkInvoiceService({
          locale: options.locale,
          messages: options.messages,
        }),
        ...options.service,
      }
    : createSdkworkInvoiceService({
        locale: options.locale,
        messages: options.messages,
      });
  const listeners = new Set<() => void>();
  let state: SdkworkInvoiceControllerState = {
    activeFilter: "all",
    dashboard: fallbackDashboard,
    isBootstrapped: false,
    isDetailLoading: false,
    isDetailOpen: false,
    isEditorOpen: false,
    isLoading: false,
    isMutating: false,
    visibleInvoices: [],
    ...options.initialState,
  };
  state.visibleInvoices = deriveVisibleInvoices(state.dashboard, state.activeFilter);

  function emit(): void {
    listeners.forEach((listener) => listener());
  }

  function setState(
    next:
      | Partial<SdkworkInvoiceControllerState>
      | ((currentState: SdkworkInvoiceControllerState) => Partial<SdkworkInvoiceControllerState>),
  ): void {
    const partial = typeof next === "function" ? next(state) : next;
    state = {
      ...state,
      ...partial,
    };
    state.visibleInvoices = deriveVisibleInvoices(state.dashboard, state.activeFilter);
    emit();
  }

  async function loadDashboard(): Promise<SdkworkInvoiceDashboardData> {
    return service.getDashboard();
  }

  async function loadDetail(invoiceId: string): Promise<SdkworkInvoiceDetail> {
    return service.getInvoiceDetail(invoiceId);
  }

  return {
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
          lastError: error instanceof Error ? error.message : copy.bootstrapFailed,
        });
        throw error;
      }
    },

    async cancelInvoice(input) {
      setState({
        isMutating: true,
        lastError: undefined,
      });

      try {
        const result = await service.cancelInvoice(input);
        const dashboard = await loadDashboard();
        const nextState: Partial<SdkworkInvoiceControllerState> = {
          dashboard,
          isBootstrapped: true,
          isMutating: false,
        };

        if (state.isDetailOpen && state.selectedInvoiceId === input.invoiceId) {
          nextState.detail = await loadDetail(input.invoiceId);
        }

        setState(nextState);
        return result;
      } catch (error) {
        setState({
          isMutating: false,
          lastError: error instanceof Error ? error.message : copy.cancelFailed,
        });
        throw error;
      }
    },

    closeDetail() {
      setState({
        detail: undefined,
        isDetailOpen: false,
        selectedInvoiceId: undefined,
      });
    },

    closeEditor() {
      setState({
        editorMode: undefined,
        isEditorOpen: false,
      });
    },

    async createInvoice(input) {
      setState({
        isMutating: true,
        lastError: undefined,
      });

      try {
        const result = await service.createInvoice(input);
        const dashboard = await loadDashboard();
        setState({
          dashboard,
          editorMode: undefined,
          isBootstrapped: true,
          isEditorOpen: false,
          isMutating: false,
          selectedInvoiceId: result.id,
        });
        return result;
      } catch (error) {
        setState({
          isMutating: false,
          lastError: error instanceof Error ? error.message : copy.createFailed,
        });
        throw error;
      }
    },

    getState() {
      return state;
    },

    openCreateDialog() {
      setState({
        editorMode: "create",
        isEditorOpen: true,
        lastError: undefined,
      });
    },

    async openDetail(invoiceId) {
      setState({
        isDetailLoading: true,
        isDetailOpen: true,
        lastError: undefined,
        selectedInvoiceId: invoiceId,
      });

      try {
        const detail = await loadDetail(invoiceId);
        setState({
          detail,
          isDetailLoading: false,
          isDetailOpen: true,
          selectedInvoiceId: invoiceId,
        });
        return state;
      } catch (error) {
        setState({
          isDetailLoading: false,
          lastError: error instanceof Error ? error.message : copy.detailFailed,
        });
        throw error;
      }
    },

    openEditDialog(invoiceId) {
      setState({
        editorMode: "edit",
        isEditorOpen: true,
        lastError: undefined,
        selectedInvoiceId: invoiceId ?? state.selectedInvoiceId,
      });
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

    setFilter(filter) {
      setState({
        activeFilter: filter,
      });
    },

    async submitInvoice(invoiceId) {
      setState({
        isMutating: true,
        lastError: undefined,
      });

      try {
        const result = await service.submitInvoice(invoiceId);
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

    async updateInvoice(input) {
      setState({
        isMutating: true,
        lastError: undefined,
      });

      try {
        const result = await service.updateInvoice(input);
        const dashboard = await loadDashboard();
        const nextState: Partial<SdkworkInvoiceControllerState> = {
          dashboard,
          editorMode: undefined,
          isBootstrapped: true,
          isEditorOpen: false,
          isMutating: false,
          selectedInvoiceId: result.id,
        };

        if (state.isDetailOpen && state.selectedInvoiceId === input.invoiceId) {
          nextState.detail = await loadDetail(input.invoiceId);
        }

        setState(nextState);
        return result;
      } catch (error) {
        setState({
          isMutating: false,
          lastError: error instanceof Error ? error.message : copy.updateFailed,
        });
        throw error;
      }
    },
  };
}

export function useSdkworkInvoiceController(
  controller?: SdkworkInvoiceController,
  options?: Pick<CreateSdkworkInvoiceControllerOptions, "locale" | "messages">,
): SdkworkInvoiceController {
  return useMemo(
    () => controller ?? createSdkworkInvoiceController({
      ...(options?.locale ? { locale: options.locale } : {}),
      ...(options?.messages ? { messages: options.messages } : {}),
    }),
    [controller, options?.locale, options?.messages],
  );
}

export function useSdkworkInvoiceControllerState(
  controller: SdkworkInvoiceController,
): SdkworkInvoiceControllerState {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
}
