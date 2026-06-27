import {
  getSdkworkCommerceService,
  hasSdkworkCommerceSession,
  requireSdkworkCommerceSession,
  toNullableSdkworkCommerceNumber,
  toSdkworkCommerceMutationStatus,
  toSdkworkCommerceNumber,
  toSdkworkCommerceOptionalString,
  unwrapSdkworkCommerceResponse,
  type SdkworkCommerceService,
} from "@sdkwork/commerce-service";

export interface SdkworkWalletAccount {
  availablePoints: number;
  cashAvailable: number;
  cashFrozen: number;
  experience: number | null;
  frozenPoints: number;
  hasPayPassword: boolean;
  level: number | null;
  levelName?: string;
  status?: string;
  statusName?: string;
  tokenBalance: number;
  totalEarned: number;
  totalPoints: number;
  totalSpent: number;
}

export interface SdkworkWalletTransaction {
  cashAmountCny: number | null;
  createdAt: string;
  id: string;
  pointsAfter: number | null;
  pointsBefore: number | null;
  pointsDelta: number;
  status?: string;
  statusName?: string;
  title: string;
  transactionId?: string;
  transactionType?: string;
  transactionTypeName?: string;
}

export interface SdkworkWalletRechargePackage {
  description?: string;
  id: number;
  points: number;
  priceCny: number;
  recommended: boolean;
  sortWeight: number | null;
  title: string;
}

export interface SdkworkWalletOverview {
  account: SdkworkWalletAccount;
  isAuthenticated: boolean;
  pointsToCashRate: number | null;
  rechargePackages: SdkworkWalletRechargePackage[];
  transactions: SdkworkWalletTransaction[];
}

export interface GetSdkworkWalletOverviewOptions {
  pageSize?: number;
}

export interface SdkworkWalletRechargeInput {
  paymentMethod?: string;
  points: number;
  remarks?: string;
  requestNo?: string;
}

export interface SdkworkWalletRechargeResult {
  cashAmountCny: number | null;
  paymentMethod?: string;
  points: number;
  processedAt?: string;
  remainingPoints: number | null;
  requestNo?: string;
  status: "completed" | "failed" | "pending";
  transactionId?: string;
}

export interface SdkworkWalletWithdrawInput {
  accountName: string;
  accountNo: string;
  amountCny: number;
  bankName?: string;
  destinationCode: string;
  remarks?: string;
  requestNo?: string;
}

export interface SdkworkWalletWithdrawResult {
  amountCny: number | null;
  destinationCode?: string;
  estimatedArrivalTime?: string;
  frozenCashAmountCny: number | null;
  processedAt?: string;
  requestNo?: string;
  remainingCashAvailable: number | null;
  status: "completed" | "failed" | "pending";
  transactionId?: string;
}

export interface CreateSdkworkWalletServiceOptions {
  commerceService?: SdkworkCommerceService;
}

export interface SdkworkWalletService {
  getEmptyOverview(): SdkworkWalletOverview;
  getOverview(options?: GetSdkworkWalletOverviewOptions): Promise<SdkworkWalletOverview>;
  rechargePoints(input: SdkworkWalletRechargeInput): Promise<SdkworkWalletRechargeResult>;
  withdrawCash(input: SdkworkWalletWithdrawInput): Promise<SdkworkWalletWithdrawResult>;
}

interface RemoteAccountSummary {
  cashAvailable?: number | string;
  cashFrozen?: number | string;
  hasPayPassword?: boolean;
  pointsAvailable?: number | string;
  pointsFrozen?: number | string;
  tokenAvailable?: number | string;
  tokenFrozen?: number | string;
}

interface RemotePointsAccount {
  availablePoints?: number | string;
  experience?: number | string;
  frozenPoints?: number | string;
  level?: number | string;
  levelName?: string;
  status?: string;
  statusName?: string;
  tokenBalance?: number | string;
  totalEarned?: number | string;
  totalPoints?: number | string;
  totalSpent?: number | string;
}

interface RemoteHistoryItem {
  amount?: number | string;
  createdAt?: string;
  historyId?: string;
  points?: number | string;
  pointsAfter?: number | string;
  pointsBefore?: number | string;
  remarks?: string;
  status?: string;
  statusName?: string;
  transactionId?: string;
  transactionType?: string;
  transactionTypeName?: string;
}

interface RemoteRechargePackage {
  description?: string;
  id?: number | string;
  name?: string;
  pointAmount?: number | string;
  price?: number | string;
  sortWeight?: number | string;
}

interface RemoteRechargeResult {
  cashAmount?: number | string;
  paymentMethod?: string;
  points?: number | string;
  processedAt?: string;
  remainingPoints?: number | string;
  requestNo?: string;
  status?: string;
  transactionId?: string;
}

interface RemoteWithdrawResult {
  amount?: number | string;
  balanceAfter?: number | string;
  createdAt?: string;
  estimatedArrivalTime?: string;
  fromBalanceAfter?: number | string;
  frozenBalance?: number | string;
  processedAt?: string;
  requestNo?: string;
  status?: string;
  transactionId?: string;
  updatedAt?: string;
  channel?: string;
  withdrawMethod?: string;
}

const DEFAULT_HISTORY_PAGE_SIZE = 50;
const SDKWORK_WALLET_REQUEST_NO_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

export function createEmptySdkworkWalletOverview(): SdkworkWalletOverview {
  return {
    account: {
      availablePoints: 0,
      cashAvailable: 0,
      cashFrozen: 0,
      experience: null,
      frozenPoints: 0,
      hasPayPassword: false,
      level: null,
      tokenBalance: 0,
      totalEarned: 0,
      totalPoints: 0,
      totalSpent: 0,
    },
    isAuthenticated: false,
    pointsToCashRate: null,
    rechargePackages: [],
    transactions: [],
  };
}

function mapAccount(
  summary: RemoteAccountSummary | null | undefined,
  points: RemotePointsAccount | null | undefined,
): SdkworkWalletAccount {
  const availablePoints = toSdkworkCommerceNumber(points?.availablePoints, toSdkworkCommerceNumber(summary?.pointsAvailable));
  const frozenPoints = toSdkworkCommerceNumber(points?.frozenPoints, toSdkworkCommerceNumber(summary?.pointsFrozen));

  return {
    availablePoints,
    cashAvailable: toSdkworkCommerceNumber(summary?.cashAvailable),
    cashFrozen: toSdkworkCommerceNumber(summary?.cashFrozen),
    experience: toNullableSdkworkCommerceNumber(points?.experience),
    frozenPoints,
    hasPayPassword: Boolean(summary?.hasPayPassword),
    level: toNullableSdkworkCommerceNumber(points?.level),
    levelName: toSdkworkCommerceOptionalString(points?.levelName),
    status: toSdkworkCommerceOptionalString(points?.status),
    statusName: toSdkworkCommerceOptionalString(points?.statusName),
    tokenBalance: toSdkworkCommerceNumber(points?.tokenBalance, toSdkworkCommerceNumber(summary?.tokenAvailable)),
    totalEarned: toSdkworkCommerceNumber(points?.totalEarned),
    totalPoints: toSdkworkCommerceNumber(points?.totalPoints, availablePoints + frozenPoints),
    totalSpent: toSdkworkCommerceNumber(points?.totalSpent),
  };
}

function resolveTransactionTitle(item: RemoteHistoryItem): string {
  return (
    toSdkworkCommerceOptionalString(item.transactionTypeName)
    || toSdkworkCommerceOptionalString(item.remarks)
    || "Wallet transaction"
  );
}

function mapTransaction(item: RemoteHistoryItem): SdkworkWalletTransaction {
  return {
    cashAmountCny: toNullableSdkworkCommerceNumber(item.amount),
    createdAt: toSdkworkCommerceOptionalString(item.createdAt) || new Date(0).toISOString(),
    id:
      toSdkworkCommerceOptionalString(item.historyId)
      || toSdkworkCommerceOptionalString(item.transactionId)
      || `wallet-transaction-${Date.now()}`,
    pointsAfter: toNullableSdkworkCommerceNumber(item.pointsAfter),
    pointsBefore: toNullableSdkworkCommerceNumber(item.pointsBefore),
    pointsDelta: toSdkworkCommerceNumber(item.points),
    status: toSdkworkCommerceOptionalString(item.status),
    statusName: toSdkworkCommerceOptionalString(item.statusName),
    title: resolveTransactionTitle(item),
    transactionId: toSdkworkCommerceOptionalString(item.transactionId),
    transactionType: toSdkworkCommerceOptionalString(item.transactionType),
    transactionTypeName: toSdkworkCommerceOptionalString(item.transactionTypeName),
  };
}

function mapRechargePackages(
  rechargePackages: RemoteRechargePackage[],
): SdkworkWalletRechargePackage[] {
  const sorted = [...rechargePackages]
    .map((rechargePackage) => ({
      description: toSdkworkCommerceOptionalString(rechargePackage.description),
      id: toSdkworkCommerceNumber(rechargePackage.id),
      points: toSdkworkCommerceNumber(rechargePackage.pointAmount),
      priceCny: toSdkworkCommerceNumber(rechargePackage.price),
      sortWeight: toNullableSdkworkCommerceNumber(rechargePackage.sortWeight),
      title: toSdkworkCommerceOptionalString(rechargePackage.name) || "Recharge package",
    }))
    .sort((left, right) => (
      (right.sortWeight ?? 0) - (left.sortWeight ?? 0)
      || right.points - left.points
      || left.id - right.id
    ));

  return sorted.map((rechargePackage, index) => ({
    ...rechargePackage,
    recommended: index === 0,
  }));
}

function mapRechargeResult(result: RemoteRechargeResult | null | undefined): SdkworkWalletRechargeResult {
  return {
    cashAmountCny: toNullableSdkworkCommerceNumber(result?.cashAmount),
    paymentMethod: toSdkworkCommerceOptionalString(result?.paymentMethod),
    points: toSdkworkCommerceNumber(result?.points),
    processedAt: toSdkworkCommerceOptionalString(result?.processedAt),
    remainingPoints: toNullableSdkworkCommerceNumber(result?.remainingPoints),
    requestNo: toSdkworkCommerceOptionalString(result?.requestNo),
    status: toSdkworkCommerceMutationStatus(toSdkworkCommerceOptionalString(result?.status)),
    transactionId: toSdkworkCommerceOptionalString(result?.transactionId),
  };
}

function mapWithdrawResult(
  result: RemoteWithdrawResult | null | undefined,
): SdkworkWalletWithdrawResult {
  return {
    amountCny: toNullableSdkworkCommerceNumber(result?.amount),
    destinationCode: toSdkworkCommerceOptionalString(result?.channel) || toSdkworkCommerceOptionalString(result?.withdrawMethod),
    estimatedArrivalTime: toSdkworkCommerceOptionalString(result?.estimatedArrivalTime),
    frozenCashAmountCny: toNullableSdkworkCommerceNumber(result?.frozenBalance),
    processedAt:
      toSdkworkCommerceOptionalString(result?.processedAt)
      || toSdkworkCommerceOptionalString(result?.updatedAt)
      || toSdkworkCommerceOptionalString(result?.createdAt),
    requestNo: toSdkworkCommerceOptionalString(result?.requestNo),
    remainingCashAvailable: toNullableSdkworkCommerceNumber(result?.fromBalanceAfter ?? result?.balanceAfter),
    status: toSdkworkCommerceMutationStatus(toSdkworkCommerceOptionalString(result?.status)),
    transactionId: toSdkworkCommerceOptionalString(result?.transactionId),
  };
}

export function createSdkworkWalletService(
  options: CreateSdkworkWalletServiceOptions = {},
): SdkworkWalletService {
  const getCommerceService = () => options.commerceService ?? getSdkworkCommerceService();

  return {
    getEmptyOverview() {
      return createEmptySdkworkWalletOverview();
    },

    async getOverview(config = {}) {
      if (!hasSdkworkCommerceSession()) {
        return createEmptySdkworkWalletOverview();
      }

      const pageSize = config.pageSize ?? DEFAULT_HISTORY_PAGE_SIZE;
      const commerceService = getCommerceService();

      const [
        summaryPayload,
        historyPagePayload,
        pointsAccountPayload,
        pointsToCashRatePayload,
        rechargePackagesPayload,
      ] = await Promise.all([
        commerceService.accounts.current.summary.retrieve(),
        commerceService.wallet.ledgerEntries.points.list({
              pageNum: 1,
              pageSize,
              sortDirection: "desc",
              sortField: "createdAt",
        }),
        commerceService.wallet.accounts.points.retrieve(),
        commerceService.wallet.exchangeRate.retrieve(),
        commerceService.recharges.packages.list(),
      ]);
      const summary = unwrapSdkworkCommerceResponse<RemoteAccountSummary | null>(summaryPayload);
      const historyPage = unwrapSdkworkCommerceResponse<{ content?: RemoteHistoryItem[] }>(historyPagePayload);
      const pointsAccount = unwrapSdkworkCommerceResponse<RemotePointsAccount | null>(pointsAccountPayload);
      const pointsToCashRate = unwrapSdkworkCommerceResponse<number | null>(pointsToCashRatePayload);
      const rechargePackages = unwrapSdkworkCommerceResponse<RemoteRechargePackage[]>(rechargePackagesPayload);

      return {
        account: mapAccount(summary, pointsAccount),
        isAuthenticated: true,
        pointsToCashRate: toNullableSdkworkCommerceNumber(pointsToCashRate),
        rechargePackages: mapRechargePackages(rechargePackages),
        transactions: (historyPage.content ?? []).map(mapTransaction),
      };
    },

    async rechargePoints(input) {
      requireSdkworkCommerceSession("Please sign in to manage wallet balances.");
      const result = unwrapSdkworkCommerceResponse<RemoteRechargeResult>(
        await getCommerceService().recharges.orders.create({
          paymentMethod: toSdkworkCommerceOptionalString(input.paymentMethod),
          points: input.points,
          remarks: toSdkworkCommerceOptionalString(input.remarks),
          requestNo: toSdkworkCommerceOptionalString(input.requestNo),
        }),
        "Failed to recharge points.",
      );

      return mapRechargeResult(result);
    },

    async withdrawCash(input) {
      requireSdkworkCommerceSession("Please sign in to manage wallet balances.");

      if (!(input.amountCny > 0)) {
        throw new Error("Withdrawal amount must be greater than zero.");
      }

      const destinationCode = toSdkworkCommerceOptionalString(input.destinationCode);
      if (!destinationCode) {
        throw new Error("Select a withdrawal destination before submitting.");
      }

      const accountName = toSdkworkCommerceOptionalString(input.accountName);
      if (!accountName) {
        throw new Error("Enter the payout account holder name before submitting.");
      }

      const accountNo = toSdkworkCommerceOptionalString(input.accountNo);
      if (!accountNo) {
        throw new Error("Enter the payout account number before submitting.");
      }

      const bankName = toSdkworkCommerceOptionalString(input.bankName);
      if (destinationCode === "bank_account" && !bankName) {
        throw new Error("Enter the settlement bank name before submitting.");
      }

      const requestNo = toSdkworkCommerceOptionalString(input.requestNo);
      if (requestNo && !SDKWORK_WALLET_REQUEST_NO_PATTERN.test(requestNo)) {
        throw new Error("Request no must use 6-64 letters, numbers, underscores, or hyphens.");
      }

      const result = unwrapSdkworkCommerceResponse<RemoteWithdrawResult>(
        await getCommerceService().wallet.withdrawalTransfers.create({
          accountName,
          accountNo,
          amount: input.amountCny,
          bankName,
          remarks: toSdkworkCommerceOptionalString(input.remarks),
          requestNo,
          withdrawMethod: destinationCode,
        }),
        "Failed to withdraw cash.",
      );

      return mapWithdrawResult(result);
    },
  };
}

export const sdkworkWalletService = createSdkworkWalletService();
