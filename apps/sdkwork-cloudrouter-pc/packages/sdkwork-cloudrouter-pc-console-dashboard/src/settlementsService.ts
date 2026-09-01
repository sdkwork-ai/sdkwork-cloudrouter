import {
  ensureSdkworkApiSuccess,
  readRequiredApiItem,
  readRecordArray,
  readString,
  sumDecimalStrings,
  type ApiRecord,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { getCloudRouterAppSdkClient } from '@sdkwork/cloudrouter-pc-console-core/sdk';

/**
 * Settlement bill lifecycle enum derived from the backend `payment_status`
 * labels emitted by the settlements dashboard read store:
 * - 已结清 (settled)          → paid   (已支付)
 * - 待结算 (rated, unsettled) → pending(待支付)
 * - 已逾期 (failed/rejected)  → closed (已关闭)
 */
export type SettlementBillStatus = 'paid' | 'pending' | 'closed';

export interface SettlementBillSummary {
  /** Total bill count for the selected year. */
  totalBills: number;
  /** Sum of all bill amounts as a fixed-width decimal string (6 dp). */
  totalSpend: string;
  /** Aggregate token usage across all bills as a decimal string. */
  totalTokens: string;
  paidBills: number;
  pendingBills: number;
  closedBills: number;
  paidSpend: string;
  pendingSpend: string;
  closedSpend: string;
}

export interface SettlementBillRecord {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  totalTokens: string;
  totalCost: string;
  status: SettlementBillStatus;
}

export interface SettlementChartPoint {
  period: string;
  cost: string;
}

export interface SettlementsSnapshot {
  summary: SettlementBillSummary;
  bills: SettlementBillRecord[];
  /** Monthly spend series aggregated from the bills, oldest first. */
  chart: SettlementChartPoint[];
}

export interface FetchSettlementsResult {
  snapshot: SettlementsSnapshot;
  queriedYear: number;
}

const STATUS_PAID_LABEL = '已结清';
const STATUS_CLOSED_LABEL = '已逾期';

/** Keep the report focused on the billing year actually queryable by the API. */
const MIN_SUPPORTED_YEAR = currentYear() - 5;

class SettlementsService {
  /**
   * Builds the list of billing years surfaced by the year selector, newest
   * first, capped at a fixed look-back window so the request always stays
   * within the API's supported year range.
   */
  listSelectableYears(today = new Date()): number[] {
    const current = today.getFullYear();
    const years: number[] = [];
    for (let year = current; year >= Math.max(current - 5, MIN_SUPPORTED_YEAR); year -= 1) {
      years.push(year);
    }
    return years;
  }

  async fetchDashboard(year: number): Promise<FetchSettlementsResult> {
    const client = getCloudRouterAppSdkClient();
    const result: unknown = await client.ai.settlements.dashboard.retrieve(
      year ? { year: String(year) } : undefined,
    );
    ensureSdkworkApiSuccess(result, 'Failed to fetch settlements dashboard');
    const snapshot = readRequiredApiItem(result, 'Settlements dashboard response is missing data');
    const bills = readRecordArray(snapshot, 'bills').map(normalizeBill);
    return {
      snapshot: {
        summary: summarizeBills(bills),
        bills,
        chart: buildMonthlyChart(bills),
      },
      queriedYear: year,
    };
  }
}

function normalizeBill(record: ApiRecord): SettlementBillRecord {
  return {
    id: readString(record, 'id'),
    period: readString(record, 'period'),
    startDate: readString(record, 'startDate'),
    endDate: readString(record, 'endDate'),
    totalTokens: readString(record, 'totalTokens', '0'),
    totalCost: readString(record, 'totalCost', '0'),
    status: resolveStatus(readString(record, 'status')),
  };
}

function resolveStatus(raw: string): SettlementBillStatus {
  if (raw === STATUS_PAID_LABEL) {
    return 'paid';
  }
  if (raw === STATUS_CLOSED_LABEL) {
    return 'closed';
  }
  return 'pending';
}

function summarizeBills(bills: SettlementBillRecord[]): SettlementBillSummary {
  let paidSpend: string[] = [];
  let pendingSpend: string[] = [];
  let closedSpend: string[] = [];
  let tokens: string[] = [];
  let paidBills = 0;
  let pendingBills = 0;
  let closedBills = 0;

  for (const bill of bills) {
    tokens.push(bill.totalTokens);
    if (bill.status === 'paid') {
      paidBills += 1;
      paidSpend.push(bill.totalCost);
    } else if (bill.status === 'closed') {
      closedBills += 1;
      closedSpend.push(bill.totalCost);
    } else {
      pendingBills += 1;
      pendingSpend.push(bill.totalCost);
    }
  }

  return {
    totalBills: bills.length,
    totalSpend: sumDecimalStrings(bills.map((bill) => bill.totalCost)),
    totalTokens: sumDecimalStrings(tokens),
    paidBills,
    pendingBills,
    closedBills,
    paidSpend: sumDecimalStrings(paidSpend),
    pendingSpend: sumDecimalStrings(pendingSpend),
    closedSpend: sumDecimalStrings(closedSpend),
  };
}

function buildMonthlyChart(bills: SettlementBillRecord[]): SettlementChartPoint[] {
  const byPeriod = new Map<string, string[]>();
  for (const bill of bills) {
    const costs = byPeriod.get(bill.period);
    if (costs) {
      costs.push(bill.totalCost);
    } else {
      byPeriod.set(bill.period, [bill.totalCost]);
    }
  }
  const entries = Array.from(byPeriod.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return entries.map(([period, costs]) => ({
    period,
    cost: sumDecimalStrings(costs),
  }));
}

function currentYear(): number {
  return new Date().getFullYear();
}

/** Singleton so the console app and any future consumers share one instance. */
export const settlementsService = new SettlementsService();
export type SettlementsServiceLike = SettlementsService;