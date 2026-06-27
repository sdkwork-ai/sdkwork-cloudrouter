import {
  getSdkworkCommerceService,
  hasSdkworkCommerceSession,
  toNullableSdkworkCommerceNumber,
  toSdkworkCommerceNumber,
  toSdkworkCommerceOptionalString,
  unwrapSdkworkCommerceResponse,
  type SdkworkCommerceService,
} from "@sdkwork/commerce-service";
import {
  createSdkworkInvoiceService,
  type SdkworkInvoiceService,
  type SdkworkInvoiceSummary,
} from "@sdkwork/commerce-pc-invoice";
import {
  createSdkworkOfferService,
  type SdkworkOfferDashboardData,
  type SdkworkOfferService,
} from "@sdkwork/commerce-pc-offer";
import {
  createSdkworkPaymentService,
  type SdkworkPaymentService,
  type SdkworkPaymentSummary,
} from "@sdkwork/commerce-pc-payment";
import {
  createSdkworkSubscriptionService,
  type SdkworkSubscriptionDashboardData,
  type SdkworkSubscriptionService,
} from "@sdkwork/commerce-pc-subscription";
import {
  createSdkworkWalletService,
  type SdkworkWalletOverview,
  type SdkworkWalletService,
} from "@sdkwork/commerce-pc-wallet";
import {
  createEmptySdkworkBillingUsageSummary,
  createSdkworkBillingBudgetPolicy,
  evaluateSdkworkBillingPosture,
  summarizeSdkworkBillingUsage,
  type SdkworkBillingAlert,
  type SdkworkBillingBreakdownKey,
  type SdkworkBillingBreakdownRow,
  type SdkworkBillingBudgetPolicy,
  type SdkworkBillingDigest,
  type SdkworkBillingPosture,
  type SdkworkBillingRecommendedAction,
  type SdkworkBillingUsageRecord,
} from "./billing";
import {
  createSdkworkBillingMessages,
  type SdkworkBillingMessagesOverrides,
} from "./billing-copy";

export interface SdkworkBillingSummary {
  activeSubscriptionPlans: number;
  availablePoints: number;
  bestOfferSavingsCny: number;
  currentLevelName: string;
  totalSpentCny: number | null;
}

export interface SdkworkBillingPaymentAttention {
  actionablePayments: number;
  availablePaymentMethods: number;
  outstandingAmountCny: number;
  recentPayments: SdkworkPaymentSummary[];
}

export interface SdkworkBillingInvoiceAttention {
  actionableInvoices: number;
  pendingInvoices: number;
  recentInvoices: SdkworkInvoiceSummary[];
}

export interface SdkworkBillingDashboardData {
  alerts: SdkworkBillingAlert[];
  breakdowns: Record<SdkworkBillingBreakdownKey, SdkworkBillingBreakdownRow[]>;
  budgetPolicy: SdkworkBillingBudgetPolicy;
  digest: SdkworkBillingDigest;
  invoiceAttention: SdkworkBillingInvoiceAttention;
  paymentAttention: SdkworkBillingPaymentAttention;
  posture: SdkworkBillingPosture;
  recentUsage: SdkworkBillingUsageRecord[];
  summary: SdkworkBillingSummary;
  topAction: SdkworkBillingRecommendedAction | null;
}

export interface GetSdkworkBillingDashboardOptions {
  referenceDate?: Date | string;
}

export interface LoadSdkworkBillingUsageRecordsOptions {
  referenceDate?: Date | string;
}

export interface CreateSdkworkBillingServiceOptions {
  budgetPolicy?: Partial<SdkworkBillingBudgetPolicy>;
  commerceService?: SdkworkCommerceService;
  invoiceService?: Partial<Pick<SdkworkInvoiceService, "getDashboard">>;
  loadUsageRecords?: (options?: LoadSdkworkBillingUsageRecordsOptions) => Promise<SdkworkBillingUsageRecord[]>;
  locale?: string | null;
  messages?: SdkworkBillingMessagesOverrides;
  offerService?: Partial<Pick<SdkworkOfferService, "getDashboard" | "getEmptyDashboard">>;
  paymentService?: Partial<Pick<SdkworkPaymentService, "getDashboard">>;
  subscriptionService?: Partial<Pick<SdkworkSubscriptionService, "getDashboard">>;
  walletService?: Partial<Pick<SdkworkWalletService, "getOverview">>;
}

export interface SdkworkBillingService {
  getDashboard(options?: GetSdkworkBillingDashboardOptions): Promise<SdkworkBillingDashboardData>;
  getEmptyDashboard(): SdkworkBillingDashboardData;
}

interface RemoteUsageRecord {
  capability?: string;
  cost?: number | string;
  costAmount?: number | string;
  costCny?: number | string;
  id?: string;
  model?: string;
  provider?: string;
  title?: string;
  unitLabel?: string;
  units?: number | string;
  usageAt?: string;
  workspace?: string;
}

interface RemoteUsageListEnvelope {
  content?: RemoteUsageRecord[];
  items?: RemoteUsageRecord[];
}

type SdkworkBillingServiceCopy = ReturnType<typeof createSdkworkBillingMessages>["service"];

function createEmptyDashboard(
  budgetPolicy: Partial<SdkworkBillingBudgetPolicy> | undefined,
  copy: SdkworkBillingServiceCopy,
): SdkworkBillingDashboardData {
  const resolvedBudgetPolicy = createSdkworkBillingBudgetPolicy(budgetPolicy);
  const summary = createEmptySdkworkBillingUsageSummary(resolvedBudgetPolicy);

  return {
    alerts: [],
    breakdowns: summary.breakdowns,
    budgetPolicy: resolvedBudgetPolicy,
    digest: summary.digest,
    invoiceAttention: {
      actionableInvoices: 0,
      pendingInvoices: 0,
      recentInvoices: [],
    },
    paymentAttention: {
      actionablePayments: 0,
      availablePaymentMethods: 0,
      outstandingAmountCny: 0,
      recentPayments: [],
    },
    posture: "healthy",
    recentUsage: [],
    summary: {
      activeSubscriptionPlans: 0,
      availablePoints: 0,
      bestOfferSavingsCny: 0,
      currentLevelName: copy.guestLevelName,
      totalSpentCny: null,
    },
    topAction: null,
  };
}

function mapRemoteUsageRecord(
  record: RemoteUsageRecord,
  index: number,
  copy: SdkworkBillingServiceCopy,
): SdkworkBillingUsageRecord {
  return {
    capability: toSdkworkCommerceOptionalString(record.capability) || copy.defaultCapability,
    costCny: Math.max(0, toSdkworkCommerceNumber(record.costCny ?? record.costAmount ?? record.cost)),
    id: toSdkworkCommerceOptionalString(record.id) || `usage-${index + 1}`,
    model: toSdkworkCommerceOptionalString(record.model) || copy.defaultModel,
    provider: toSdkworkCommerceOptionalString(record.provider) || copy.defaultProvider,
    title: toSdkworkCommerceOptionalString(record.title) || toSdkworkCommerceOptionalString(record.model) || copy.defaultUsageTitle,
    unitLabel: toSdkworkCommerceOptionalString(record.unitLabel) || copy.defaultUnitLabel,
    units: Math.max(0, Math.round(toSdkworkCommerceNumber(record.units))),
    usageAt: toSdkworkCommerceOptionalString(record.usageAt) || new Date(0).toISOString(),
    workspace: toSdkworkCommerceOptionalString(record.workspace) || copy.defaultWorkspace,
  };
}

async function loadUsageRecordsFromCommerceService(
  commerceService: SdkworkCommerceService,
  copy: SdkworkBillingServiceCopy,
  options: LoadSdkworkBillingUsageRecordsOptions = {},
): Promise<SdkworkBillingUsageRecord[]> {
  const payload = unwrapSdkworkCommerceResponse<RemoteUsageListEnvelope | RemoteUsageRecord[] | null>(
    await commerceService.billing.history.list({
      referenceDate:
        typeof options.referenceDate === "string"
          ? options.referenceDate
          : options.referenceDate instanceof Date
          ? options.referenceDate.toISOString()
          : undefined,
    }),
    copy.loadUsageFailed,
  );

  const records = Array.isArray(payload)
    ? payload
    : payload?.items ?? payload?.content ?? [];

  return records.map((record, index) => mapRemoteUsageRecord(record, index, copy));
}

function sumOutstandingAmount(records: readonly SdkworkPaymentSummary[]): number {
  return Math.round(
    records.reduce((sum, record) => {
      if (record.status !== "default" && record.status !== "pending") {
        return sum;
      }

      return sum + toSdkworkCommerceNumber(record.amountCny);
    }, 0) * 100,
  ) / 100;
}

function createSummary(
  walletOverview: SdkworkWalletOverview,
  subscriptionDashboard: SdkworkSubscriptionDashboardData,
  offerDashboard: SdkworkOfferDashboardData,
  copy: SdkworkBillingServiceCopy,
): SdkworkBillingSummary {
  return {
    activeSubscriptionPlans: subscriptionDashboard.plans.length,
    availablePoints: walletOverview.account.availablePoints,
    bestOfferSavingsCny: offerDashboard.digest.highlightedSavingsCny,
    currentLevelName:
      subscriptionDashboard.summary.currentLevelName
      || offerDashboard.inventory.currentLevelName
      || copy.guestLevelName,
    totalSpentCny: subscriptionDashboard.summary.totalSpent,
  };
}

export function createSdkworkBillingService(
  options: CreateSdkworkBillingServiceOptions = {},
): SdkworkBillingService {
  const copy = createSdkworkBillingMessages(options.locale, options.messages).service;
  const resolvedBudgetPolicy = createSdkworkBillingBudgetPolicy(options.budgetPolicy);
  const getCommerceService = () => options.commerceService ?? getSdkworkCommerceService();
  const childServiceOptions = {
    commerceService: options.commerceService,
    locale: options.locale,
  };
  const walletService: Pick<SdkworkWalletService, "getOverview"> = options.walletService
    ? {
        ...createSdkworkWalletService({ commerceService: options.commerceService }),
        ...options.walletService,
      }
    : createSdkworkWalletService({ commerceService: options.commerceService });
  const subscriptionService: Pick<SdkworkSubscriptionService, "getDashboard"> = options.subscriptionService
    ? {
        ...createSdkworkSubscriptionService(childServiceOptions),
        ...options.subscriptionService,
      }
    : createSdkworkSubscriptionService(childServiceOptions);
  const paymentService: Pick<SdkworkPaymentService, "getDashboard"> = options.paymentService
    ? {
        ...createSdkworkPaymentService(childServiceOptions),
        ...options.paymentService,
      }
    : createSdkworkPaymentService(childServiceOptions);
  const invoiceService: Pick<SdkworkInvoiceService, "getDashboard"> = options.invoiceService
    ? {
        ...createSdkworkInvoiceService(childServiceOptions),
        ...options.invoiceService,
      }
    : createSdkworkInvoiceService(childServiceOptions);
  const offerService: Pick<SdkworkOfferService, "getDashboard" | "getEmptyDashboard"> = options.offerService
    ? {
        ...createSdkworkOfferService(childServiceOptions),
        ...options.offerService,
      }
    : createSdkworkOfferService(childServiceOptions);
  const loadUsageRecords = options.loadUsageRecords ?? ((config?: LoadSdkworkBillingUsageRecordsOptions) =>
    loadUsageRecordsFromCommerceService(getCommerceService(), copy, config));

  return {
    getEmptyDashboard() {
      return createEmptyDashboard(resolvedBudgetPolicy, copy);
    },

    async getDashboard(config = {}) {
      if (!hasSdkworkCommerceSession()) {
        return createEmptyDashboard(resolvedBudgetPolicy, copy);
      }

      const walletOverview = await walletService.getOverview();
      if (!walletOverview.isAuthenticated) {
        return createEmptyDashboard(resolvedBudgetPolicy, copy);
      }

      const [usageRecords, subscriptionDashboard, paymentDashboard, invoiceDashboard, offerDashboard] = await Promise.all([
        loadUsageRecords({
          referenceDate: config.referenceDate,
        }),
        subscriptionService.getDashboard(),
        paymentService.getDashboard(),
        invoiceService.getDashboard(),
        offerService.getDashboard(),
      ]);
      const usageSummary = summarizeSdkworkBillingUsage(usageRecords, {
        budgetPolicy: resolvedBudgetPolicy,
        referenceDate: config.referenceDate,
      });
      const outstandingAmountCny = sumOutstandingAmount(paymentDashboard.records);
      const digest: SdkworkBillingDigest = {
        ...usageSummary.digest,
        outstandingAmountCny,
        savingsOpportunityCny: offerDashboard.digest.highlightedSavingsCny,
      };
      const posture = evaluateSdkworkBillingPosture({
        actionablePayments: paymentDashboard.digest.actionablePayments,
        digest,
        invoiceActionRequired: invoiceDashboard.digest.actionableInvoices,
        locale: options.locale,
        messages: options.messages,
        warningThreshold: resolvedBudgetPolicy.warningThreshold,
      });

      return {
        alerts: posture.alerts,
        breakdowns: usageSummary.breakdowns,
        budgetPolicy: resolvedBudgetPolicy,
        digest,
        invoiceAttention: {
          actionableInvoices: invoiceDashboard.digest.actionableInvoices,
          pendingInvoices: invoiceDashboard.statistics.pendingInvoices,
          recentInvoices: invoiceDashboard.invoices.slice(0, 5),
        },
        paymentAttention: {
          actionablePayments: paymentDashboard.digest.actionablePayments,
          availablePaymentMethods: paymentDashboard.methods.filter((method) => method.available).length,
          outstandingAmountCny,
          recentPayments: paymentDashboard.records.slice(0, 5),
        },
        posture: posture.status,
        recentUsage: usageSummary.recentUsage,
        summary: createSummary(walletOverview, subscriptionDashboard, offerDashboard, copy),
        topAction: posture.topAction,
      };
    },
  };
}

export const sdkworkBillingService = createSdkworkBillingService();
