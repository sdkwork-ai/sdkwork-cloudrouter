import {
  createSdkworkAppCapabilityManifest,
  type CreateSdkworkAppCapabilityManifestOptions,
  type SdkworkAppCapabilityManifest,
} from "@sdkwork/appbase-pc-react";
import { createInvoiceRouteIntent } from "@sdkwork/commerce-pc-invoice";
import {
  createOfferRouteIntent,
  createSdkworkCommercialAction,
  type SdkworkCommercialAction,
  type SdkworkCommercialActionCapability,
} from "@sdkwork/commerce-pc-offer";
import { createPaymentRouteIntent } from "@sdkwork/commerce-pc-payment";
import { createSubscriptionRouteIntent } from "@sdkwork/commerce-pc-subscription";
import {
  createSdkworkBillingMessages,
  normalizeSdkworkBillingLocale,
  type SdkworkBillingMessagesOverrides,
} from "./billing-copy";

export type SdkworkBillingPosture =
  | "healthy"
  | "watch"
  | "over-budget"
  | "payment-attention";

export type SdkworkBillingAlertSeverity = "info" | "warning" | "critical";
export type SdkworkBillingActionTarget = Extract<
  SdkworkCommercialActionCapability,
  "billing" | "invoice" | "offer" | "payment" | "subscription"
>;
export type SdkworkBillingActionIntent = "open" | "resolve" | "review" | "upgrade";
export type SdkworkBillingBreakdownKey =
  | "provider"
  | "model"
  | "capability"
  | "workspace";
export type SdkworkBillingTab = "overview" | "invoices";

export interface SdkworkBillingWorkspaceManifest extends SdkworkAppCapabilityManifest {
  capability: "billing";
  routePath: string;
}

export interface CreateBillingWorkspaceManifestOptions
  extends Partial<
    Pick<CreateSdkworkAppCapabilityManifestOptions, "description" | "host" | "id" | "packageNames" | "theme" | "title">
  > {
  locale?: string | null;
  messages?: SdkworkBillingMessagesOverrides;
  routePath?: string;
}

export interface SdkworkBillingRouteIntent {
  breakdown?: SdkworkBillingBreakdownKey;
  focusWindow: boolean;
  route: string;
  source: "billing-workspace";
  tab?: SdkworkBillingTab;
  type: "billing-route-intent";
}

export interface CreateBillingRouteIntentOptions {
  basePath?: string;
  breakdown?: SdkworkBillingBreakdownKey;
  focusWindow?: boolean;
  tab?: SdkworkBillingTab;
}

export interface SdkworkBillingBudgetPolicy {
  budgetAmountCny: number;
  currency: "CNY";
  projectionDays: number;
  warningThreshold: number;
}

export interface CreateSdkworkBillingBudgetPolicyOptions {
  budgetAmountCny?: number;
  projectionDays?: number;
  warningThreshold?: number;
}

export interface SdkworkBillingUsageRecord {
  capability: string;
  costCny: number;
  id: string;
  model: string;
  provider: string;
  title: string;
  unitLabel: string;
  units: number;
  usageAt: string;
  workspace: string;
}

export interface SdkworkBillingBreakdownRow {
  changeRate: number;
  costCny: number;
  id: string;
  kind: SdkworkBillingBreakdownKey;
  label: string;
  share: number;
  units: number;
}

export interface SdkworkBillingDigest {
  budgetAmountCny: number;
  budgetRemainingCny: number;
  monthSpendCny: number;
  outstandingAmountCny: number;
  projectedMonthSpendCny: number;
  savingsOpportunityCny: number;
  todaySpendCny: number;
}

export type SdkworkBillingAlertAction = SdkworkCommercialAction<
  SdkworkBillingActionTarget,
  SdkworkBillingActionIntent
>;

export interface SdkworkBillingAlert {
  action?: SdkworkBillingAlertAction;
  description: string;
  id: string;
  severity: SdkworkBillingAlertSeverity;
  title: string;
  value?: string;
}

export interface SdkworkBillingRecommendedAction extends SdkworkBillingAlertAction {
  reason: "budget-watch" | "invoice-attention" | "over-budget" | "payment-attention";
}

export interface SdkworkBillingUsageSummary {
  breakdowns: Record<SdkworkBillingBreakdownKey, SdkworkBillingBreakdownRow[]>;
  digest: SdkworkBillingDigest;
  recentUsage: SdkworkBillingUsageRecord[];
}

export interface SummarizeSdkworkBillingUsageOptions {
  budgetPolicy?: Partial<SdkworkBillingBudgetPolicy>;
  referenceDate?: Date | string;
}

export interface EvaluateSdkworkBillingPostureInput {
  actionablePayments: number;
  digest: SdkworkBillingDigest;
  invoiceActionRequired: number;
  locale?: string | null;
  messages?: SdkworkBillingMessagesOverrides;
  warningThreshold?: number;
}

export interface SdkworkBillingPostureEvaluation {
  alerts: SdkworkBillingAlert[];
  status: SdkworkBillingPosture;
  topAction: SdkworkBillingRecommendedAction | null;
}

function normalizeBasePath(basePath: string | undefined): string {
  const normalized = (basePath ?? "/billing").trim();
  if (!normalized || normalized === "/") {
    return "/billing";
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function toSafeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPercentage(value: number): number {
  return Math.round(value * 10) / 10;
}

function toStartCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatProviderLabel(provider: string): string {
  const normalized = provider.trim().toLowerCase();

  if (normalized === "openai") {
    return "OpenAI";
  }

  if (normalized === "anthropic") {
    return "Anthropic";
  }

  if (normalized === "google") {
    return "Google";
  }

  if (normalized === "deepseek") {
    return "DeepSeek";
  }

  return toStartCase(provider);
}

function resolveReferenceDate(referenceDate: Date | string | undefined): Date {
  if (referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())) {
    return referenceDate;
  }

  if (typeof referenceDate === "string") {
    const parsed = new Date(referenceDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function isSameUtcDay(left: Date, right: Date): boolean {
  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth()
    && left.getUTCDate() === right.getUTCDate();
}

function isSameUtcMonth(left: Date, right: Date): boolean {
  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth();
}

function getBreakdownValue(
  record: SdkworkBillingUsageRecord,
  kind: SdkworkBillingBreakdownKey,
): string {
  if (kind === "provider") {
    return record.provider;
  }

  if (kind === "model") {
    return record.model;
  }

  if (kind === "capability") {
    return record.capability;
  }

  return record.workspace;
}

function getBreakdownLabel(
  kind: SdkworkBillingBreakdownKey,
  value: string,
): string {
  if (kind === "provider") {
    return formatProviderLabel(value);
  }

  if (kind === "model") {
    return value;
  }

  return toStartCase(value);
}

function buildBreakdownRows(
  records: readonly SdkworkBillingUsageRecord[],
  kind: SdkworkBillingBreakdownKey,
): SdkworkBillingBreakdownRow[] {
  const totalCost = records.reduce((sum, record) => sum + toSafeNumber(record.costCny), 0);
  const rows = new Map<string, SdkworkBillingBreakdownRow>();

  records.forEach((record) => {
    const rawValue = getBreakdownValue(record, kind) || "unknown";
    const current = rows.get(rawValue) ?? {
      changeRate: 0,
      costCny: 0,
      id: rawValue,
      kind,
      label: getBreakdownLabel(kind, rawValue),
      share: 0,
      units: 0,
    };

    current.costCny = roundCurrency(current.costCny + toSafeNumber(record.costCny));
    current.units += Math.max(0, Math.round(toSafeNumber(record.units)));
    rows.set(rawValue, current);
  });

  return [...rows.values()]
    .map((row) => ({
      ...row,
      share: totalCost > 0 ? roundPercentage((row.costCny / totalCost) * 100) : 0,
    }))
    .sort(
      (left, right) =>
        right.costCny - left.costCny
        || right.units - left.units
        || left.label.localeCompare(right.label),
    );
}

function createZeroBreakdowns(): Record<SdkworkBillingBreakdownKey, SdkworkBillingBreakdownRow[]> {
  return {
    capability: [],
    model: [],
    provider: [],
    workspace: [],
  };
}

function formatBillingValue(value: number, locale?: string | null): string {
  return new Intl.NumberFormat(normalizeSdkworkBillingLocale(locale), {
    currency: "CNY",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(roundCurrency(value));
}

export function formatSdkworkBillingPosture(
  posture: SdkworkBillingPosture,
  locale?: string | null,
  messages?: SdkworkBillingMessagesOverrides,
): string {
  const copy = createSdkworkBillingMessages(locale, messages);

  if (posture === "healthy") {
    return copy.posture.healthy;
  }

  if (posture === "watch") {
    return copy.posture.watch;
  }

  if (posture === "over-budget") {
    return copy.posture.overBudget;
  }

  return copy.posture.paymentAttention;
}

export function createSdkworkBillingBudgetPolicy(
  options: CreateSdkworkBillingBudgetPolicyOptions = {},
): SdkworkBillingBudgetPolicy {
  return {
    budgetAmountCny: Math.max(0, roundCurrency(options.budgetAmountCny ?? 200)),
    currency: "CNY",
    projectionDays: Math.max(1, Math.round(options.projectionDays ?? 30)),
    warningThreshold: Math.min(1, Math.max(0, options.warningThreshold ?? 0.8)),
  };
}

export function createBillingWorkspaceManifest({
  description,
  host,
  id = "sdkwork-billing",
  locale,
  messages,
  packageNames = [
    "@sdkwork/commerce-pc-billing",
    "@sdkwork/commerce-pc-payment",
    "@sdkwork/commerce-pc-invoice",
    "@sdkwork/commerce-pc-order",
    "@sdkwork/commerce-pc-subscription",
    "@sdkwork/commerce-pc-offer",
    "@sdkwork/commerce-pc-points",
    "@sdkwork/commerce-pc-wallet",
  ],
  routePath = "/billing",
  theme,
  title,
}: CreateBillingWorkspaceManifestOptions = {}): SdkworkBillingWorkspaceManifest {
  const copy = createSdkworkBillingMessages(locale, messages).manifest;

  return {
    ...createSdkworkAppCapabilityManifest({
      description: description ?? copy.description,
      host,
      id,
      packageNames,
      theme,
      title: title ?? copy.title,
    }),
    capability: "billing",
    routePath: normalizeBasePath(routePath),
  };
}

export function createBillingRouteIntent(
  options: CreateBillingRouteIntentOptions = {},
): SdkworkBillingRouteIntent {
  const basePath = normalizeBasePath(options.basePath);
  const queryParams = new URLSearchParams();

  if (options.tab) {
    queryParams.set("tab", options.tab);
  }

  if (options.breakdown) {
    queryParams.set("breakdown", options.breakdown);
  }

  const querySuffix = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return {
    ...(options.breakdown ? { breakdown: options.breakdown } : {}),
    focusWindow: options.focusWindow !== false,
    route: `${basePath}${querySuffix}`,
    source: "billing-workspace",
    ...(options.tab ? { tab: options.tab } : {}),
    type: "billing-route-intent",
  };
}

export function summarizeSdkworkBillingUsage(
  usageRecords: readonly SdkworkBillingUsageRecord[],
  options: SummarizeSdkworkBillingUsageOptions = {},
): SdkworkBillingUsageSummary {
  const budgetPolicy = createSdkworkBillingBudgetPolicy(options.budgetPolicy);
  const referenceDate = resolveReferenceDate(options.referenceDate);
  const currentMonthRecords = usageRecords.filter((record) => {
    const usageDate = new Date(record.usageAt);
    return !Number.isNaN(usageDate.getTime()) && isSameUtcMonth(usageDate, referenceDate);
  });
  const monthSpendCny = roundCurrency(
    currentMonthRecords.reduce((sum, record) => sum + toSafeNumber(record.costCny), 0),
  );
  const todaySpendCny = roundCurrency(
    usageRecords.reduce((sum, record) => {
      const usageDate = new Date(record.usageAt);
      if (Number.isNaN(usageDate.getTime()) || !isSameUtcDay(usageDate, referenceDate)) {
        return sum;
      }

      return sum + toSafeNumber(record.costCny);
    }, 0),
  );
  const elapsedDays = Math.max(1, referenceDate.getUTCDate());
  const projectedMonthSpendCny = monthSpendCny > 0
    ? roundCurrency((monthSpendCny / elapsedDays) * budgetPolicy.projectionDays)
    : 0;
  const digest: SdkworkBillingDigest = {
    budgetAmountCny: budgetPolicy.budgetAmountCny,
    budgetRemainingCny: roundCurrency(Math.max(0, budgetPolicy.budgetAmountCny - monthSpendCny)),
    monthSpendCny,
    outstandingAmountCny: 0,
    projectedMonthSpendCny,
    savingsOpportunityCny: 0,
    todaySpendCny,
  };
  const recentUsage = [...usageRecords].sort(
    (left, right) =>
      new Date(right.usageAt).getTime() - new Date(left.usageAt).getTime()
      || right.costCny - left.costCny
      || left.title.localeCompare(right.title),
  );

  return {
    breakdowns: {
      capability: buildBreakdownRows(currentMonthRecords, "capability"),
      model: buildBreakdownRows(currentMonthRecords, "model"),
      provider: buildBreakdownRows(currentMonthRecords, "provider"),
      workspace: buildBreakdownRows(currentMonthRecords, "workspace"),
    },
    digest,
    recentUsage,
  };
}

export function createEmptySdkworkBillingUsageSummary(
  budgetPolicy?: Partial<SdkworkBillingBudgetPolicy>,
): SdkworkBillingUsageSummary {
  const resolvedPolicy = createSdkworkBillingBudgetPolicy(budgetPolicy);

  return {
    breakdowns: createZeroBreakdowns(),
    digest: {
      budgetAmountCny: resolvedPolicy.budgetAmountCny,
      budgetRemainingCny: resolvedPolicy.budgetAmountCny,
      monthSpendCny: 0,
      outstandingAmountCny: 0,
      projectedMonthSpendCny: 0,
      savingsOpportunityCny: 0,
      todaySpendCny: 0,
    },
    recentUsage: [],
  };
}

export function evaluateSdkworkBillingPosture(
  input: EvaluateSdkworkBillingPostureInput,
): SdkworkBillingPostureEvaluation {
  const copy = createSdkworkBillingMessages(input.locale, input.messages);
  const alerts: SdkworkBillingAlert[] = [];
  const budgetExceeded =
    input.digest.budgetAmountCny > 0 &&
    input.digest.projectedMonthSpendCny > input.digest.budgetAmountCny;
  const budgetWatch =
    !budgetExceeded &&
    input.digest.budgetAmountCny > 0 &&
    input.digest.monthSpendCny >= input.digest.budgetAmountCny * Math.min(1, Math.max(0, input.warningThreshold ?? 0.8));

  if (input.actionablePayments > 0 && input.digest.outstandingAmountCny > 0) {
    alerts.push({
      action: createSdkworkCommercialAction({
        capability: "payment",
        intent: "resolve",
        label: copy.alerts.paymentAttention.action,
        route: createPaymentRouteIntent({
          filter: "actionable",
        }).route,
      }),
      description: copy.alerts.paymentAttention.description,
      id: "payment-attention",
      severity: "critical",
      title: copy.alerts.paymentAttention.title,
      value: formatBillingValue(input.digest.outstandingAmountCny, input.locale),
    });
  }

  if (budgetExceeded) {
    alerts.push({
      action: createSdkworkCommercialAction({
        capability: "subscription",
        intent: "upgrade",
        label: copy.alerts.projectedBudgetOverrun.action,
        route: createSubscriptionRouteIntent({
          mode: "upgrade",
        }).route,
      }),
      description: copy.alerts.projectedBudgetOverrun.description,
      id: "projected-budget-overrun",
      severity: "warning",
      title: copy.alerts.projectedBudgetOverrun.title,
      value: formatBillingValue(input.digest.projectedMonthSpendCny, input.locale),
    });
  } else if (budgetWatch) {
    alerts.push({
      action: createSdkworkCommercialAction({
        capability: "offer",
        intent: "review",
        label: copy.alerts.budgetWatch.action,
        route: createOfferRouteIntent({
          group: "membership",
        }).route,
      }),
      description: copy.alerts.budgetWatch.description,
      id: "budget-watch",
      severity: "warning",
      title: copy.alerts.budgetWatch.title,
      value: formatBillingValue(input.digest.monthSpendCny, input.locale),
    });
  }

  if (input.invoiceActionRequired > 0) {
    alerts.push({
      action: createSdkworkCommercialAction({
        capability: "invoice",
        intent: "review",
        label: copy.alerts.invoiceAttention.action,
        route: createInvoiceRouteIntent({
          filter: "actionable",
        }).route,
      }),
      description: copy.alerts.invoiceAttention.description,
      id: "invoice-attention",
      severity: "warning",
      title: copy.alerts.invoiceAttention.title,
      value: String(input.invoiceActionRequired),
    });
  }

  const paymentAlert = alerts.find((alert) => alert.id === "payment-attention");
  if (paymentAlert?.action) {
    return {
      alerts,
      status: "payment-attention",
      topAction: {
        ...paymentAlert.action,
        reason: "payment-attention",
      },
    };
  }

  const overBudgetAlert = alerts.find((alert) => alert.id === "projected-budget-overrun");
  if (overBudgetAlert?.action) {
    return {
      alerts,
      status: "over-budget",
      topAction: {
        ...overBudgetAlert.action,
        reason: "over-budget",
      },
    };
  }

  const invoiceAlert = alerts.find((alert) => alert.id === "invoice-attention");
  if (invoiceAlert?.action) {
    return {
      alerts,
      status: "watch",
      topAction: {
        ...invoiceAlert.action,
        reason: "invoice-attention",
      },
    };
  }

  const watchAlert = alerts.find((alert) => alert.id === "budget-watch");
  if (watchAlert?.action) {
    return {
      alerts,
      status: "watch",
      topAction: {
        ...watchAlert.action,
        reason: "budget-watch",
      },
    };
  }

  return {
    alerts,
    status: "healthy",
    topAction: null,
  };
}

export const billingPackageMeta = {
  architecture: "pc-react",
  domain: "commerce",
  package: "@sdkwork/commerce-pc-billing",
  status: "ready",
} as const;

export type BillingPackageMeta = typeof billingPackageMeta;
