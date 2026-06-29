import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { AccountsCurrentSummaryRetrieveResult, AddressesCreateResult, AddressesDefaultSelectionCreateResult, AddressesUpdateResult, CartCurrentRetrieveResult, CartItemsCreateResult, CartItemsUpdateResult, CatalogCategoriesRetrieveResult, CatalogProductsRetrieveResult, CatalogSkusPricesRetrieveResult, CatalogSkusRetrieveResult, CatalogSpusRetrieveResult, CheckoutSessionsCreateResult, CheckoutSessionsOrdersCreateResult, CheckoutSessionsQuotesCreateResult, CheckoutSessionsRetrieveResult, FulfillmentsRetrieveResult, InvoicesCancellationsCreateResult, InvoicesCreateResult, InvoicesRetrieveResult, InvoicesStatisticsRetrieveResult, InvoicesSubmissionsCreateResult, InvoicesUpdateResult, MembershipsCurrentRetrieveResult, MembershipsCurrentStatusRetrieveResult, MembershipsPackageGroupsRetrieveResult, MembershipsPackagesRetrieveResult, MembershipsPointsBalanceRetrieveResult, MembershipsPointsDailyRewardsCreateResult, MembershipsPointsDailyRewardsStatusRetrieveResult, MembershipsPrivilegesSpeedUpsCreateResult, MembershipsPrivilegesUsageRetrieveResult, MembershipsPurchasesCreateResult, MembershipsPurchasesRenewResult, MembershipsPurchasesUpgradeResult, OrdersCancellationsCreateResult, OrdersCancelResult, OrdersCreateResult, OrdersPaymentSuccessRetrieveResult, OrdersPayResult, OrdersRetrieveResult, OrdersStatisticsRetrieveResult, OrdersStatusRetrieveResult, PageInfo, PaymentsAttemptsRetrieveResult, PaymentsCheckoutRetrieveResult, PaymentsCloseResult, PaymentsCreateResult, PaymentsIntentsAttemptsCreateResult, PaymentsIntentsCancelResult, PaymentsIntentsCreateResult, PaymentsIntentsRetrieveResult, PaymentsReconcileResult, PaymentsRecordsRetrieveResult, PaymentsStatisticsRetrieveResult, PaymentsStatusRetrieveByOutTradeNoResult, PaymentsStatusRetrieveResult, RechargesOrdersCancelResult, RechargesOrdersCreateResult, RechargesOrdersRetrieveResult, RechargesSettingsRetrieveResult, RefundsCreateResult, RefundsRetrieveResult, ShipmentsRetrieveResult, WalletAccountsOverviewRetrieveResult, WalletAccountsPointsRetrieveResult, WalletAccountsRetrieveResult, WalletAccountsTokensRetrieveResult, WalletAdjustmentsCreateResult, WalletExchangeRateRetrieveResult, WalletHoldsCreateResult, WalletHoldsReleasesCreateResult, WalletHoldsSettlementsCreateResult, WalletLedgerEntriesRetrieveResult, WalletOverviewRetrieveResult, WalletPointExchangesCreateResult, WalletPointExchangesRetrieveResult, WalletPointTransfersCreateResult, WalletRequestsRetrieveResult, WalletTokensRetrieveResult, WalletTopupTransfersCreateResult, WalletTransactionsRetrieveResult, WalletWithdrawalTransfersCreateResult } from '../types';


export class CommerceWalletWithdrawalTransfersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletWithdrawalTransfersCreateResult> {
    return this.client.post<WalletWithdrawalTransfersCreateResult>(appApiPath(`/wallet/withdrawal_transfers`));
  }
}

export class CommerceWalletTransactionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/wallet/transactions`));
  }

/** Retrieve */
  async retrieve(transactionId: string): Promise<WalletTransactionsRetrieveResult> {
    return this.client.get<WalletTransactionsRetrieveResult>(appApiPath(`/wallet/transactions/${serializePathParameter(transactionId, { name: 'transactionId', style: 'simple', explode: false })}`));
  }
}

export class CommerceWalletTopupTransfersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletTopupTransfersCreateResult> {
    return this.client.post<WalletTopupTransfersCreateResult>(appApiPath(`/wallet/topup_transfers`));
  }
}

export class CommerceWalletTokensApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletTokensRetrieveResult> {
    return this.client.get<WalletTokensRetrieveResult>(appApiPath(`/wallet/tokens`));
  }
}

export class CommerceWalletRequestsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(requestNo: string): Promise<WalletRequestsRetrieveResult> {
    return this.client.get<WalletRequestsRetrieveResult>(appApiPath(`/wallet/requests/${serializePathParameter(requestNo, { name: 'requestNo', style: 'simple', explode: false })}`));
  }
}

export class CommerceWalletPointsExchangeRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/wallet/points/exchanges/rules`));
  }
}

export class CommerceWalletPointsApi {
  private client: HttpClient;
  public readonly exchangeRules: CommerceWalletPointsExchangeRulesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.exchangeRules = new CommerceWalletPointsExchangeRulesApi(client);
  }

}

export class CommerceWalletPointTransfersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletPointTransfersCreateResult> {
    return this.client.post<WalletPointTransfersCreateResult>(appApiPath(`/wallet/point_transfers`));
  }
}

export class CommerceWalletPointExchangesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletPointExchangesCreateResult> {
    return this.client.post<WalletPointExchangesCreateResult>(appApiPath(`/wallet/point_exchanges`));
  }

/** Retrieve */
  async retrieve(exchangeNo: string): Promise<WalletPointExchangesRetrieveResult> {
    return this.client.get<WalletPointExchangesRetrieveResult>(appApiPath(`/wallet/point_exchanges/${serializePathParameter(exchangeNo, { name: 'exchangeNo', style: 'simple', explode: false })}`));
  }
}

export class CommerceWalletOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletOverviewRetrieveResult> {
    return this.client.get<WalletOverviewRetrieveResult>(appApiPath(`/wallet/overview`));
  }
}

export class CommerceWalletLedgerEntriesPointsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/wallet/ledger_entries/points`));
  }
}

export class CommerceWalletLedgerEntriesApi {
  private client: HttpClient;
  public readonly points: CommerceWalletLedgerEntriesPointsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.points = new CommerceWalletLedgerEntriesPointsApi(client);
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/wallet/ledger_entries`));
  }

/** Retrieve */
  async retrieve(ledgerEntryId: string): Promise<WalletLedgerEntriesRetrieveResult> {
    return this.client.get<WalletLedgerEntriesRetrieveResult>(appApiPath(`/wallet/ledger_entries/${serializePathParameter(ledgerEntryId, { name: 'ledgerEntryId', style: 'simple', explode: false })}`));
  }
}

export class CommerceWalletHoldsSettlementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletHoldsSettlementsCreateResult> {
    return this.client.post<WalletHoldsSettlementsCreateResult>(appApiPath(`/wallet/holds/settlements`));
  }
}

export class CommerceWalletHoldsReleasesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletHoldsReleasesCreateResult> {
    return this.client.post<WalletHoldsReleasesCreateResult>(appApiPath(`/wallet/holds/releases`));
  }
}

export class CommerceWalletHoldsApi {
  private client: HttpClient;
  public readonly releases: CommerceWalletHoldsReleasesApi;
  public readonly settlements: CommerceWalletHoldsSettlementsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.releases = new CommerceWalletHoldsReleasesApi(client);
    this.settlements = new CommerceWalletHoldsSettlementsApi(client);
  }


/** Create */
  async create(): Promise<WalletHoldsCreateResult> {
    return this.client.post<WalletHoldsCreateResult>(appApiPath(`/wallet/holds`));
  }
}

export class CommerceWalletExchangeRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/wallet/exchange_rules`));
  }
}

export class CommerceWalletExchangeRateApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletExchangeRateRetrieveResult> {
    return this.client.get<WalletExchangeRateRetrieveResult>(appApiPath(`/wallet/exchange_rate`));
  }
}

export class CommerceWalletAdjustmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletAdjustmentsCreateResult> {
    return this.client.post<WalletAdjustmentsCreateResult>(appApiPath(`/wallet/adjustments`));
  }
}

export class CommerceWalletAccountsTokensApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletAccountsTokensRetrieveResult> {
    return this.client.get<WalletAccountsTokensRetrieveResult>(appApiPath(`/wallet/accounts/tokens`));
  }
}

export class CommerceWalletAccountsPointsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletAccountsPointsRetrieveResult> {
    return this.client.get<WalletAccountsPointsRetrieveResult>(appApiPath(`/wallet/accounts/points`));
  }
}

export class CommerceWalletAccountsOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletAccountsOverviewRetrieveResult> {
    return this.client.get<WalletAccountsOverviewRetrieveResult>(appApiPath(`/wallet/accounts/overview`));
  }
}

export class CommerceWalletAccountsApi {
  private client: HttpClient;
  public readonly overview: CommerceWalletAccountsOverviewApi;
  public readonly points: CommerceWalletAccountsPointsApi;
  public readonly tokens: CommerceWalletAccountsTokensApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.overview = new CommerceWalletAccountsOverviewApi(client);
    this.points = new CommerceWalletAccountsPointsApi(client);
    this.tokens = new CommerceWalletAccountsTokensApi(client);
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/wallet/accounts`));
  }

/** Retrieve */
  async retrieve(accountId: string): Promise<WalletAccountsRetrieveResult> {
    return this.client.get<WalletAccountsRetrieveResult>(appApiPath(`/wallet/accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`));
  }
}

export class CommerceWalletApi {
  private client: HttpClient;
  public readonly accounts: CommerceWalletAccountsApi;
  public readonly adjustments: CommerceWalletAdjustmentsApi;
  public readonly exchangeRate: CommerceWalletExchangeRateApi;
  public readonly exchangeRules: CommerceWalletExchangeRulesApi;
  public readonly holds: CommerceWalletHoldsApi;
  public readonly ledgerEntries: CommerceWalletLedgerEntriesApi;
  public readonly overview: CommerceWalletOverviewApi;
  public readonly pointExchanges: CommerceWalletPointExchangesApi;
  public readonly pointTransfers: CommerceWalletPointTransfersApi;
  public readonly points: CommerceWalletPointsApi;
  public readonly requests: CommerceWalletRequestsApi;
  public readonly tokens: CommerceWalletTokensApi;
  public readonly topupTransfers: CommerceWalletTopupTransfersApi;
  public readonly transactions: CommerceWalletTransactionsApi;
  public readonly withdrawalTransfers: CommerceWalletWithdrawalTransfersApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.accounts = new CommerceWalletAccountsApi(client);
    this.adjustments = new CommerceWalletAdjustmentsApi(client);
    this.exchangeRate = new CommerceWalletExchangeRateApi(client);
    this.exchangeRules = new CommerceWalletExchangeRulesApi(client);
    this.holds = new CommerceWalletHoldsApi(client);
    this.ledgerEntries = new CommerceWalletLedgerEntriesApi(client);
    this.overview = new CommerceWalletOverviewApi(client);
    this.pointExchanges = new CommerceWalletPointExchangesApi(client);
    this.pointTransfers = new CommerceWalletPointTransfersApi(client);
    this.points = new CommerceWalletPointsApi(client);
    this.requests = new CommerceWalletRequestsApi(client);
    this.tokens = new CommerceWalletTokensApi(client);
    this.topupTransfers = new CommerceWalletTopupTransfersApi(client);
    this.transactions = new CommerceWalletTransactionsApi(client);
    this.withdrawalTransfers = new CommerceWalletWithdrawalTransfersApi(client);
  }

}

export class CommerceShipmentsTrackingEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shipmentId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/shipments/${serializePathParameter(shipmentId, { name: 'shipmentId', style: 'simple', explode: false })}/tracking_events`));
  }
}

export class CommerceShipmentsPackagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shipmentId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/shipments/${serializePathParameter(shipmentId, { name: 'shipmentId', style: 'simple', explode: false })}/packages`));
  }
}

export class CommerceShipmentsApi {
  private client: HttpClient;
  public readonly packages: CommerceShipmentsPackagesApi;
  public readonly trackingEvents: CommerceShipmentsTrackingEventsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.packages = new CommerceShipmentsPackagesApi(client);
    this.trackingEvents = new CommerceShipmentsTrackingEventsApi(client);
  }


/** Retrieve */
  async retrieve(shipmentId: string): Promise<ShipmentsRetrieveResult> {
    return this.client.get<ShipmentsRetrieveResult>(appApiPath(`/shipments/${serializePathParameter(shipmentId, { name: 'shipmentId', style: 'simple', explode: false })}`));
  }
}

export class CommerceRefundsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/refunds`));
  }

/** Create */
  async create(): Promise<RefundsCreateResult> {
    return this.client.post<RefundsCreateResult>(appApiPath(`/refunds`));
  }

/** Retrieve */
  async retrieve(refundId: string): Promise<RefundsRetrieveResult> {
    return this.client.get<RefundsRetrieveResult>(appApiPath(`/refunds/${serializePathParameter(refundId, { name: 'refundId', style: 'simple', explode: false })}`));
  }
}

export class CommerceRechargesSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<RechargesSettingsRetrieveResult> {
    return this.client.get<RechargesSettingsRetrieveResult>(appApiPath(`/recharges/settings`));
  }
}

export class CommerceRechargesPackagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/recharges/packages`));
  }
}

export class CommerceRechargesOrdersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<RechargesOrdersCreateResult> {
    return this.client.post<RechargesOrdersCreateResult>(appApiPath(`/recharges/orders`));
  }

/** Retrieve */
  async retrieve(orderId: string): Promise<RechargesOrdersRetrieveResult> {
    return this.client.get<RechargesOrdersRetrieveResult>(appApiPath(`/recharges/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`));
  }

/** Cancel */
  async cancel(orderId: string): Promise<RechargesOrdersCancelResult> {
    return this.client.post<RechargesOrdersCancelResult>(appApiPath(`/recharges/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/cancellations`));
  }
}

export class CommerceRechargesApi {
  private client: HttpClient;
  public readonly orders: CommerceRechargesOrdersApi;
  public readonly packages: CommerceRechargesPackagesApi;
  public readonly settings: CommerceRechargesSettingsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.orders = new CommerceRechargesOrdersApi(client);
    this.packages = new CommerceRechargesPackagesApi(client);
    this.settings = new CommerceRechargesSettingsApi(client);
  }

}

export class CommercePaymentsStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve by out trade no */
  async retrieveByOutTradeNo(outTradeNo: string): Promise<PaymentsStatusRetrieveByOutTradeNoResult> {
    return this.client.get<PaymentsStatusRetrieveByOutTradeNoResult>(appApiPath(`/payments/status/out_trade_no/${serializePathParameter(outTradeNo, { name: 'outTradeNo', style: 'simple', explode: false })}`));
  }

/** Retrieve */
  async retrieve(paymentId: string): Promise<PaymentsStatusRetrieveResult> {
    return this.client.get<PaymentsStatusRetrieveResult>(appApiPath(`/payments/status/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}`));
  }
}

export class CommercePaymentsStatisticsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<PaymentsStatisticsRetrieveResult> {
    return this.client.get<PaymentsStatisticsRetrieveResult>(appApiPath(`/payments/statistics`));
  }
}

export class CommercePaymentsRecordsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/payments/records`));
  }

/** Retrieve */
  async retrieve(paymentId: string): Promise<PaymentsRecordsRetrieveResult> {
    return this.client.get<PaymentsRecordsRetrieveResult>(appApiPath(`/payments/records/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}`));
  }
}

export class CommercePaymentsMethodsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/payments/methods`));
  }
}

export class CommercePaymentsIntentsAttemptsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(paymentIntentId: string): Promise<PaymentsIntentsAttemptsCreateResult> {
    return this.client.post<PaymentsIntentsAttemptsCreateResult>(appApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}/attempts`));
  }
}

export class CommercePaymentsIntentsApi {
  private client: HttpClient;
  public readonly attempts: CommercePaymentsIntentsAttemptsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.attempts = new CommercePaymentsIntentsAttemptsApi(client);
  }


/** Create */
  async create(): Promise<PaymentsIntentsCreateResult> {
    return this.client.post<PaymentsIntentsCreateResult>(appApiPath(`/payments/intents`));
  }

/** Retrieve */
  async retrieve(paymentIntentId: string): Promise<PaymentsIntentsRetrieveResult> {
    return this.client.get<PaymentsIntentsRetrieveResult>(appApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}`));
  }

/** Cancel */
  async cancel(paymentIntentId: string): Promise<PaymentsIntentsCancelResult> {
    return this.client.post<PaymentsIntentsCancelResult>(appApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}/cancel`));
  }
}

export class CommercePaymentsCheckoutApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(paymentId: string): Promise<PaymentsCheckoutRetrieveResult> {
    return this.client.get<PaymentsCheckoutRetrieveResult>(appApiPath(`/payments/checkout/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}`));
  }
}

export class CommercePaymentsAttemptsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(paymentAttemptId: string): Promise<PaymentsAttemptsRetrieveResult> {
    return this.client.get<PaymentsAttemptsRetrieveResult>(appApiPath(`/payments/attempts/${serializePathParameter(paymentAttemptId, { name: 'paymentAttemptId', style: 'simple', explode: false })}`));
  }
}

export class CommercePaymentsOrderPaymentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(orderId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/payments`));
  }
}

export class CommercePaymentsApi {
  private client: HttpClient;
  public readonly orderPayments: CommercePaymentsOrderPaymentsApi;
  public readonly attempts: CommercePaymentsAttemptsApi;
  public readonly checkout: CommercePaymentsCheckoutApi;
  public readonly intents: CommercePaymentsIntentsApi;
  public readonly methods: CommercePaymentsMethodsApi;
  public readonly records: CommercePaymentsRecordsApi;
  public readonly statistics: CommercePaymentsStatisticsApi;
  public readonly status: CommercePaymentsStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.orderPayments = new CommercePaymentsOrderPaymentsApi(client);
    this.attempts = new CommercePaymentsAttemptsApi(client);
    this.checkout = new CommercePaymentsCheckoutApi(client);
    this.intents = new CommercePaymentsIntentsApi(client);
    this.methods = new CommercePaymentsMethodsApi(client);
    this.records = new CommercePaymentsRecordsApi(client);
    this.statistics = new CommercePaymentsStatisticsApi(client);
    this.status = new CommercePaymentsStatusApi(client);
  }


/** Create */
  async create(): Promise<PaymentsCreateResult> {
    return this.client.post<PaymentsCreateResult>(appApiPath(`/payments`));
  }

/** Reconcile */
  async reconcile(): Promise<PaymentsReconcileResult> {
    return this.client.post<PaymentsReconcileResult>(appApiPath(`/payments/reconciliations`));
  }

/** Close */
  async close(paymentId: string): Promise<PaymentsCloseResult> {
    return this.client.post<PaymentsCloseResult>(appApiPath(`/payments/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}/close`));
  }
}

export class CommerceOrdersStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(orderId: string): Promise<OrdersStatusRetrieveResult> {
    return this.client.get<OrdersStatusRetrieveResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/status`));
  }
}

export class CommerceOrdersPaymentSuccessApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(orderId: string): Promise<OrdersPaymentSuccessRetrieveResult> {
    return this.client.get<OrdersPaymentSuccessRetrieveResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/payment_success`));
  }
}

export class CommerceOrdersEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(orderId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/events`));
  }
}

export class CommerceOrdersCancellationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(orderId: string): Promise<OrdersCancellationsCreateResult> {
    return this.client.post<OrdersCancellationsCreateResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/cancellations`));
  }
}

export class CommerceOrdersStatisticsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<OrdersStatisticsRetrieveResult> {
    return this.client.get<OrdersStatisticsRetrieveResult>(appApiPath(`/orders/statistics`));
  }
}

export class CommerceOrdersApi {
  private client: HttpClient;
  public readonly statistics: CommerceOrdersStatisticsApi;
  public readonly cancellations: CommerceOrdersCancellationsApi;
  public readonly events: CommerceOrdersEventsApi;
  public readonly paymentSuccess: CommerceOrdersPaymentSuccessApi;
  public readonly status: CommerceOrdersStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.statistics = new CommerceOrdersStatisticsApi(client);
    this.cancellations = new CommerceOrdersCancellationsApi(client);
    this.events = new CommerceOrdersEventsApi(client);
    this.paymentSuccess = new CommerceOrdersPaymentSuccessApi(client);
    this.status = new CommerceOrdersStatusApi(client);
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/orders`));
  }

/** Create */
  async create(): Promise<OrdersCreateResult> {
    return this.client.post<OrdersCreateResult>(appApiPath(`/orders`));
  }

/** Retrieve */
  async retrieve(orderId: string): Promise<OrdersRetrieveResult> {
    return this.client.get<OrdersRetrieveResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`));
  }

/** Cancel */
  async cancel(orderId: string): Promise<OrdersCancelResult> {
    return this.client.post<OrdersCancelResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/cancel`));
  }

/** Pay */
  async pay(orderId: string): Promise<OrdersPayResult> {
    return this.client.post<OrdersPayResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/payments`));
  }
}

export class CommerceMembershipsPurchasesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<MembershipsPurchasesCreateResult> {
    return this.client.post<MembershipsPurchasesCreateResult>(appApiPath(`/memberships/purchases`));
  }

/** Renew */
  async renew(): Promise<MembershipsPurchasesRenewResult> {
    return this.client.post<MembershipsPurchasesRenewResult>(appApiPath(`/memberships/purchases/renew`));
  }

/** Upgrade */
  async upgrade(): Promise<MembershipsPurchasesUpgradeResult> {
    return this.client.post<MembershipsPurchasesUpgradeResult>(appApiPath(`/memberships/purchases/upgrade`));
  }
}

export class CommerceMembershipsPrivilegesUsageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<MembershipsPrivilegesUsageRetrieveResult> {
    return this.client.get<MembershipsPrivilegesUsageRetrieveResult>(appApiPath(`/memberships/privileges/usage`));
  }
}

export class CommerceMembershipsPrivilegesSpeedUpsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<MembershipsPrivilegesSpeedUpsCreateResult> {
    return this.client.post<MembershipsPrivilegesSpeedUpsCreateResult>(appApiPath(`/memberships/privileges/speed_ups`));
  }
}

export class CommerceMembershipsPrivilegesApi {
  private client: HttpClient;
  public readonly speedUps: CommerceMembershipsPrivilegesSpeedUpsApi;
  public readonly usage: CommerceMembershipsPrivilegesUsageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.speedUps = new CommerceMembershipsPrivilegesSpeedUpsApi(client);
    this.usage = new CommerceMembershipsPrivilegesUsageApi(client);
  }

}

export class CommerceMembershipsPointsHistoryApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/memberships/points/history`));
  }
}

export class CommerceMembershipsPointsDailyRewardsStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<MembershipsPointsDailyRewardsStatusRetrieveResult> {
    return this.client.get<MembershipsPointsDailyRewardsStatusRetrieveResult>(appApiPath(`/memberships/points/daily_rewards/status`));
  }
}

export class CommerceMembershipsPointsDailyRewardsApi {
  private client: HttpClient;
  public readonly status: CommerceMembershipsPointsDailyRewardsStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.status = new CommerceMembershipsPointsDailyRewardsStatusApi(client);
  }


/** Create */
  async create(): Promise<MembershipsPointsDailyRewardsCreateResult> {
    return this.client.post<MembershipsPointsDailyRewardsCreateResult>(appApiPath(`/memberships/points/daily_rewards`));
  }
}

export class CommerceMembershipsPointsBalanceApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<MembershipsPointsBalanceRetrieveResult> {
    return this.client.get<MembershipsPointsBalanceRetrieveResult>(appApiPath(`/memberships/points/balance`));
  }
}

export class CommerceMembershipsPointsApi {
  private client: HttpClient;
  public readonly balance: CommerceMembershipsPointsBalanceApi;
  public readonly dailyRewards: CommerceMembershipsPointsDailyRewardsApi;
  public readonly history: CommerceMembershipsPointsHistoryApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.balance = new CommerceMembershipsPointsBalanceApi(client);
    this.dailyRewards = new CommerceMembershipsPointsDailyRewardsApi(client);
    this.history = new CommerceMembershipsPointsHistoryApi(client);
  }

}

export class CommerceMembershipsPlansApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/memberships/plans`));
  }
}

export class CommerceMembershipsPackagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/memberships/packages`));
  }

/** Retrieve */
  async retrieve(packageId: string): Promise<MembershipsPackagesRetrieveResult> {
    return this.client.get<MembershipsPackagesRetrieveResult>(appApiPath(`/memberships/packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}`));
  }
}

export class CommerceMembershipsPackageGroupsPackagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(packageGroupId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}/packages`));
  }
}

export class CommerceMembershipsPackageGroupsApi {
  private client: HttpClient;
  public readonly packages: CommerceMembershipsPackageGroupsPackagesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.packages = new CommerceMembershipsPackageGroupsPackagesApi(client);
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/memberships/package_groups`));
  }

/** Retrieve */
  async retrieve(packageGroupId: string): Promise<MembershipsPackageGroupsRetrieveResult> {
    return this.client.get<MembershipsPackageGroupsRetrieveResult>(appApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}`));
  }
}

export class CommerceMembershipsCurrentStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<MembershipsCurrentStatusRetrieveResult> {
    return this.client.get<MembershipsCurrentStatusRetrieveResult>(appApiPath(`/memberships/current/status`));
  }
}

export class CommerceMembershipsCurrentApi {
  private client: HttpClient;
  public readonly status: CommerceMembershipsCurrentStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.status = new CommerceMembershipsCurrentStatusApi(client);
  }


/** Retrieve */
  async retrieve(): Promise<MembershipsCurrentRetrieveResult> {
    return this.client.get<MembershipsCurrentRetrieveResult>(appApiPath(`/memberships/current`));
  }
}

export class CommerceMembershipsBenefitsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/memberships/benefits`));
  }
}

export class CommerceMembershipsApi {
  private client: HttpClient;
  public readonly benefits: CommerceMembershipsBenefitsApi;
  public readonly current: CommerceMembershipsCurrentApi;
  public readonly packageGroups: CommerceMembershipsPackageGroupsApi;
  public readonly packages: CommerceMembershipsPackagesApi;
  public readonly plans: CommerceMembershipsPlansApi;
  public readonly points: CommerceMembershipsPointsApi;
  public readonly privileges: CommerceMembershipsPrivilegesApi;
  public readonly purchases: CommerceMembershipsPurchasesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.benefits = new CommerceMembershipsBenefitsApi(client);
    this.current = new CommerceMembershipsCurrentApi(client);
    this.packageGroups = new CommerceMembershipsPackageGroupsApi(client);
    this.packages = new CommerceMembershipsPackagesApi(client);
    this.plans = new CommerceMembershipsPlansApi(client);
    this.points = new CommerceMembershipsPointsApi(client);
    this.privileges = new CommerceMembershipsPrivilegesApi(client);
    this.purchases = new CommerceMembershipsPurchasesApi(client);
  }

}

export class CommerceInvoicesSubmissionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(invoiceId: string): Promise<InvoicesSubmissionsCreateResult> {
    return this.client.post<InvoicesSubmissionsCreateResult>(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}/submissions`));
  }
}

export class CommerceInvoicesItemsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(invoiceId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}/items`));
  }
}

export class CommerceInvoicesCancellationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(invoiceId: string): Promise<InvoicesCancellationsCreateResult> {
    return this.client.post<InvoicesCancellationsCreateResult>(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}/cancellations`));
  }
}

export class CommerceInvoicesStatisticsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<InvoicesStatisticsRetrieveResult> {
    return this.client.get<InvoicesStatisticsRetrieveResult>(appApiPath(`/invoices/statistics`));
  }
}

export class CommerceInvoicesMineApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/invoices/current`));
  }
}

export class CommerceInvoicesApi {
  private client: HttpClient;
  public readonly mine: CommerceInvoicesMineApi;
  public readonly statistics: CommerceInvoicesStatisticsApi;
  public readonly cancellations: CommerceInvoicesCancellationsApi;
  public readonly items: CommerceInvoicesItemsApi;
  public readonly submissions: CommerceInvoicesSubmissionsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.mine = new CommerceInvoicesMineApi(client);
    this.statistics = new CommerceInvoicesStatisticsApi(client);
    this.cancellations = new CommerceInvoicesCancellationsApi(client);
    this.items = new CommerceInvoicesItemsApi(client);
    this.submissions = new CommerceInvoicesSubmissionsApi(client);
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/invoices`));
  }

/** Create */
  async create(): Promise<InvoicesCreateResult> {
    return this.client.post<InvoicesCreateResult>(appApiPath(`/invoices`));
  }

/** Retrieve */
  async retrieve(invoiceId: string): Promise<InvoicesRetrieveResult> {
    return this.client.get<InvoicesRetrieveResult>(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(invoiceId: string): Promise<InvoicesUpdateResult> {
    return this.client.patch<InvoicesUpdateResult>(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}`));
  }
}

export class CommerceFulfillmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/fulfillments`));
  }

/** Retrieve */
  async retrieve(fulfillmentId: string): Promise<FulfillmentsRetrieveResult> {
    return this.client.get<FulfillmentsRetrieveResult>(appApiPath(`/fulfillments/${serializePathParameter(fulfillmentId, { name: 'fulfillmentId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCheckoutSessionsQuotesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(checkoutSessionId: string): Promise<CheckoutSessionsQuotesCreateResult> {
    return this.client.post<CheckoutSessionsQuotesCreateResult>(appApiPath(`/checkout/sessions/${serializePathParameter(checkoutSessionId, { name: 'checkoutSessionId', style: 'simple', explode: false })}/quotes`));
  }
}

export class CommerceCheckoutSessionsOrdersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(checkoutSessionId: string): Promise<CheckoutSessionsOrdersCreateResult> {
    return this.client.post<CheckoutSessionsOrdersCreateResult>(appApiPath(`/checkout/sessions/${serializePathParameter(checkoutSessionId, { name: 'checkoutSessionId', style: 'simple', explode: false })}/orders`));
  }
}

export class CommerceCheckoutSessionsApi {
  private client: HttpClient;
  public readonly orders: CommerceCheckoutSessionsOrdersApi;
  public readonly quotes: CommerceCheckoutSessionsQuotesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.orders = new CommerceCheckoutSessionsOrdersApi(client);
    this.quotes = new CommerceCheckoutSessionsQuotesApi(client);
  }


/** Create */
  async create(): Promise<CheckoutSessionsCreateResult> {
    return this.client.post<CheckoutSessionsCreateResult>(appApiPath(`/checkout/sessions`));
  }

/** Retrieve */
  async retrieve(checkoutSessionId: string): Promise<CheckoutSessionsRetrieveResult> {
    return this.client.get<CheckoutSessionsRetrieveResult>(appApiPath(`/checkout/sessions/${serializePathParameter(checkoutSessionId, { name: 'checkoutSessionId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCheckoutApi {
  private client: HttpClient;
  public readonly sessions: CommerceCheckoutSessionsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.sessions = new CommerceCheckoutSessionsApi(client);
  }

}

export class CommerceCatalogSpusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/catalog/spus`));
  }

/** Retrieve */
  async retrieve(spuId: string): Promise<CatalogSpusRetrieveResult> {
    return this.client.get<CatalogSpusRetrieveResult>(appApiPath(`/catalog/spus/${serializePathParameter(spuId, { name: 'spuId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCatalogSkusPricesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(skuId: string): Promise<CatalogSkusPricesRetrieveResult> {
    return this.client.get<CatalogSkusPricesRetrieveResult>(appApiPath(`/catalog/skus/${serializePathParameter(skuId, { name: 'skuId', style: 'simple', explode: false })}/prices`));
  }
}

export class CommerceCatalogSkusApi {
  private client: HttpClient;
  public readonly prices: CommerceCatalogSkusPricesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.prices = new CommerceCatalogSkusPricesApi(client);
  }


/** Retrieve */
  async retrieve(skuId: string): Promise<CatalogSkusRetrieveResult> {
    return this.client.get<CatalogSkusRetrieveResult>(appApiPath(`/catalog/skus/${serializePathParameter(skuId, { name: 'skuId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCatalogProductsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/catalog/products`));
  }

/** Retrieve */
  async retrieve(productId: string): Promise<CatalogProductsRetrieveResult> {
    return this.client.get<CatalogProductsRetrieveResult>(appApiPath(`/catalog/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCatalogCategoriesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/catalog/categories`));
  }

/** Retrieve */
  async retrieve(categoryId: string): Promise<CatalogCategoriesRetrieveResult> {
    return this.client.get<CatalogCategoriesRetrieveResult>(appApiPath(`/catalog/categories/${serializePathParameter(categoryId, { name: 'categoryId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCatalogAttributesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/catalog/attributes`));
  }
}

export class CommerceCatalogApi {
  private client: HttpClient;
  public readonly attributes: CommerceCatalogAttributesApi;
  public readonly categories: CommerceCatalogCategoriesApi;
  public readonly products: CommerceCatalogProductsApi;
  public readonly skus: CommerceCatalogSkusApi;
  public readonly spus: CommerceCatalogSpusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.attributes = new CommerceCatalogAttributesApi(client);
    this.categories = new CommerceCatalogCategoriesApi(client);
    this.products = new CommerceCatalogProductsApi(client);
    this.skus = new CommerceCatalogSkusApi(client);
    this.spus = new CommerceCatalogSpusApi(client);
  }

}

export class CommerceCartItemsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<CartItemsCreateResult> {
    return this.client.post<CartItemsCreateResult>(appApiPath(`/cart/items`));
  }

/** Delete */
  async delete(cartItemId: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(appApiPath(`/cart/items/${serializePathParameter(cartItemId, { name: 'cartItemId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(cartItemId: string): Promise<CartItemsUpdateResult> {
    return this.client.patch<CartItemsUpdateResult>(appApiPath(`/cart/items/${serializePathParameter(cartItemId, { name: 'cartItemId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCartCurrentApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<CartCurrentRetrieveResult> {
    return this.client.get<CartCurrentRetrieveResult>(appApiPath(`/cart/current`));
  }
}

export class CommerceCartApi {
  private client: HttpClient;
  public readonly current: CommerceCartCurrentApi;
  public readonly items: CommerceCartItemsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.current = new CommerceCartCurrentApi(client);
    this.items = new CommerceCartItemsApi(client);
  }

}

export class CommerceBillingHistoryApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/billing/history`));
  }
}

export class CommerceBillingApi {
  private client: HttpClient;
  public readonly history: CommerceBillingHistoryApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.history = new CommerceBillingHistoryApi(client);
  }

}

export class CommerceAddressesDefaultSelectionApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(addressId: string): Promise<AddressesDefaultSelectionCreateResult> {
    return this.client.post<AddressesDefaultSelectionCreateResult>(appApiPath(`/addresses/${serializePathParameter(addressId, { name: 'addressId', style: 'simple', explode: false })}/default_selection`));
  }
}

export class CommerceAddressesApi {
  private client: HttpClient;
  public readonly defaultSelection: CommerceAddressesDefaultSelectionApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.defaultSelection = new CommerceAddressesDefaultSelectionApi(client);
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/addresses`));
  }

/** Create */
  async create(): Promise<AddressesCreateResult> {
    return this.client.post<AddressesCreateResult>(appApiPath(`/addresses`));
  }

/** Delete */
  async delete(addressId: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(appApiPath(`/addresses/${serializePathParameter(addressId, { name: 'addressId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(addressId: string): Promise<AddressesUpdateResult> {
    return this.client.patch<AddressesUpdateResult>(appApiPath(`/addresses/${serializePathParameter(addressId, { name: 'addressId', style: 'simple', explode: false })}`));
  }
}

export class CommerceAccountsCurrentSummaryApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<AccountsCurrentSummaryRetrieveResult> {
    return this.client.get<AccountsCurrentSummaryRetrieveResult>(appApiPath(`/accounts/current/summary`));
  }
}

export class CommerceAccountsCurrentApi {
  private client: HttpClient;
  public readonly summary: CommerceAccountsCurrentSummaryApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.summary = new CommerceAccountsCurrentSummaryApi(client);
  }

}

export class CommerceAccountsApi {
  private client: HttpClient;
  public readonly current: CommerceAccountsCurrentApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.current = new CommerceAccountsCurrentApi(client);
  }

}

export class CommerceApi {
  private client: HttpClient;
  public readonly accounts: CommerceAccountsApi;
  public readonly addresses: CommerceAddressesApi;
  public readonly billing: CommerceBillingApi;
  public readonly cart: CommerceCartApi;
  public readonly catalog: CommerceCatalogApi;
  public readonly checkout: CommerceCheckoutApi;
  public readonly fulfillments: CommerceFulfillmentsApi;
  public readonly invoices: CommerceInvoicesApi;
  public readonly memberships: CommerceMembershipsApi;
  public readonly orders: CommerceOrdersApi;
  public readonly payments: CommercePaymentsApi;
  public readonly recharges: CommerceRechargesApi;
  public readonly refunds: CommerceRefundsApi;
  public readonly shipments: CommerceShipmentsApi;
  public readonly wallet: CommerceWalletApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.accounts = new CommerceAccountsApi(client);
    this.addresses = new CommerceAddressesApi(client);
    this.billing = new CommerceBillingApi(client);
    this.cart = new CommerceCartApi(client);
    this.catalog = new CommerceCatalogApi(client);
    this.checkout = new CommerceCheckoutApi(client);
    this.fulfillments = new CommerceFulfillmentsApi(client);
    this.invoices = new CommerceInvoicesApi(client);
    this.memberships = new CommerceMembershipsApi(client);
    this.orders = new CommerceOrdersApi(client);
    this.payments = new CommercePaymentsApi(client);
    this.recharges = new CommerceRechargesApi(client);
    this.refunds = new CommerceRefundsApi(client);
    this.shipments = new CommerceShipmentsApi(client);
    this.wallet = new CommerceWalletApi(client);
  }

}

export function createCommerceApi(client: HttpClient): CommerceApi {
  return new CommerceApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
