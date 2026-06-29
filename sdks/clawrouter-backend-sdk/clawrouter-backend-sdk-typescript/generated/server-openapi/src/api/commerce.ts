import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CatalogAttributesCreateResult, CatalogCategoriesCreateResult, CatalogCategoriesUpdateResult, CatalogCategoryAttributesCreateResult, CatalogCategoryAttributesUpdateResult, CatalogCategorySeedsCreateResult, CatalogProductsCreateResult, CatalogProductsManagementRetrieveResult, CatalogProductsUpdateResult, CatalogSkusCreateResult, CatalogSkusUpdateResult, CatalogSpusArchiveResult, CatalogSpusCreateResult, CatalogSpusPublishResult, CatalogSpusUpdateResult, CommerceReportsPaymentReconciliationRetrieveResult, FulfillmentsManagementRetrieveResult, FulfillmentsUpdateResult, InventoryStocksUpdateResult, InvoicesIssuancesCreateResult, InvoicesManagementRetrieveResult, InvoicesVoidsCreateResult, MembershipsMembersUpdateResult, MembershipsPackageGroupsCreateResult, MembershipsPackageGroupsUpdateResult, MembershipsPackagesCreateResult, MembershipsPackagesUpdateResult, MembershipsPlansCreateResult, MembershipsPlansUpdateResult, OrdersManagementCancelResult, OrdersManagementCloseResult, OrdersManagementRetrieveResult, PageInfo, PaymentsChannelsCreateResult, PaymentsChannelsUpdateResult, PaymentsIntentsManagementRetrieveResult, PaymentsMethodsCreateResult, PaymentsMethodsUpdateResult, PaymentsProviderAccountsCreateResult, PaymentsProviderAccountsStatusUpdateResult, PaymentsProviderAccountsUpdateResult, PaymentsProvidersUpdateResult, PaymentsReconciliationRunsCreateResult, PaymentsRouteRulesCreateResult, PaymentsRouteRulesUpdateResult, PaymentsRuntimeSnapshotRetrieveResult, PaymentsWebhookEventsReplaysCreateResult, RechargesOrdersManagementRetrieveResult, RechargesPackagesCreateResult, RechargesPackagesUpdateResult, RechargesSettingsManagementRetrieveResult, RechargesSettingsUpdateResult, RefundsManagementRetrieveResult, ShipmentsManagementRetrieveResult, ShipmentsPackagesCreateResult, ShipmentsPackagesUpdateResult, WalletAdjustmentsManagementCreateResult, WalletExchangeRulesUpdateResult } from '../types';


export class CommerceWalletLedgerEntriesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/wallet/ledger_entries`));
  }
}

export class CommerceWalletLedgerEntriesApi {
  private client: HttpClient;
  public readonly management: CommerceWalletLedgerEntriesManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceWalletLedgerEntriesManagementApi(client);
  }

}

export class CommerceWalletHoldsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/wallet/holds`));
  }
}

export class CommerceWalletExchangeRulesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/wallet/exchange_rules`));
  }
}

export class CommerceWalletExchangeRulesApi {
  private client: HttpClient;
  public readonly management: CommerceWalletExchangeRulesManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceWalletExchangeRulesManagementApi(client);
  }


/** Update */
  async update(): Promise<WalletExchangeRulesUpdateResult> {
    return this.client.put<WalletExchangeRulesUpdateResult>(backendApiPath(`/wallet/exchange_rules`));
  }
}

export class CommerceWalletAdjustmentsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletAdjustmentsManagementCreateResult> {
    return this.client.post<WalletAdjustmentsManagementCreateResult>(backendApiPath(`/wallet/adjustments`));
  }
}

export class CommerceWalletAdjustmentsApi {
  private client: HttpClient;
  public readonly management: CommerceWalletAdjustmentsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceWalletAdjustmentsManagementApi(client);
  }

}

export class CommerceWalletAccountsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/wallet/accounts`));
  }
}

export class CommerceWalletAccountsApi {
  private client: HttpClient;
  public readonly management: CommerceWalletAccountsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceWalletAccountsManagementApi(client);
  }

}

export class CommerceWalletApi {
  private client: HttpClient;
  public readonly accounts: CommerceWalletAccountsApi;
  public readonly adjustments: CommerceWalletAdjustmentsApi;
  public readonly exchangeRules: CommerceWalletExchangeRulesApi;
  public readonly holds: CommerceWalletHoldsApi;
  public readonly ledgerEntries: CommerceWalletLedgerEntriesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.accounts = new CommerceWalletAccountsApi(client);
    this.adjustments = new CommerceWalletAdjustmentsApi(client);
    this.exchangeRules = new CommerceWalletExchangeRulesApi(client);
    this.holds = new CommerceWalletHoldsApi(client);
    this.ledgerEntries = new CommerceWalletLedgerEntriesApi(client);
  }

}

export class CommerceShipmentsTrackingEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shipmentId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shipments/${serializePathParameter(shipmentId, { name: 'shipmentId', style: 'simple', explode: false })}/tracking_events`));
  }
}

export class CommerceShipmentsPackagesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(shipmentId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shipments/${serializePathParameter(shipmentId, { name: 'shipmentId', style: 'simple', explode: false })}/packages`));
  }
}

export class CommerceShipmentsPackagesApi {
  private client: HttpClient;
  public readonly management: CommerceShipmentsPackagesManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceShipmentsPackagesManagementApi(client);
  }


/** Create */
  async create(shipmentId: string): Promise<ShipmentsPackagesCreateResult> {
    return this.client.post<ShipmentsPackagesCreateResult>(backendApiPath(`/shipments/${serializePathParameter(shipmentId, { name: 'shipmentId', style: 'simple', explode: false })}/packages`));
  }

/** Update */
  async update(shipmentId: string, packageId: string): Promise<ShipmentsPackagesUpdateResult> {
    return this.client.patch<ShipmentsPackagesUpdateResult>(backendApiPath(`/shipments/${serializePathParameter(shipmentId, { name: 'shipmentId', style: 'simple', explode: false })}/packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}`));
  }
}

export class CommerceShipmentsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(shipmentId: string): Promise<ShipmentsManagementRetrieveResult> {
    return this.client.get<ShipmentsManagementRetrieveResult>(backendApiPath(`/shipments/${serializePathParameter(shipmentId, { name: 'shipmentId', style: 'simple', explode: false })}`));
  }
}

export class CommerceShipmentsApi {
  private client: HttpClient;
  public readonly management: CommerceShipmentsManagementApi;
  public readonly packages: CommerceShipmentsPackagesApi;
  public readonly trackingEvents: CommerceShipmentsTrackingEventsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceShipmentsManagementApi(client);
    this.packages = new CommerceShipmentsPackagesApi(client);
    this.trackingEvents = new CommerceShipmentsTrackingEventsApi(client);
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/shipments`));
  }
}

export class CommerceRefundsAttemptsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(refundId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/refunds/${serializePathParameter(refundId, { name: 'refundId', style: 'simple', explode: false })}/attempts`));
  }
}

export class CommerceRefundsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/refunds`));
  }

/** Retrieve */
  async retrieve(refundId: string): Promise<RefundsManagementRetrieveResult> {
    return this.client.get<RefundsManagementRetrieveResult>(backendApiPath(`/refunds/${serializePathParameter(refundId, { name: 'refundId', style: 'simple', explode: false })}`));
  }
}

export class CommerceRefundsApi {
  private client: HttpClient;
  public readonly management: CommerceRefundsManagementApi;
  public readonly attempts: CommerceRefundsAttemptsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceRefundsManagementApi(client);
    this.attempts = new CommerceRefundsAttemptsApi(client);
  }

}

export class CommerceRechargesSettingsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<RechargesSettingsManagementRetrieveResult> {
    return this.client.get<RechargesSettingsManagementRetrieveResult>(backendApiPath(`/recharges/settings`));
  }
}

export class CommerceRechargesSettingsApi {
  private client: HttpClient;
  public readonly management: CommerceRechargesSettingsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceRechargesSettingsManagementApi(client);
  }


/** Update */
  async update(): Promise<RechargesSettingsUpdateResult> {
    return this.client.put<RechargesSettingsUpdateResult>(backendApiPath(`/recharges/settings`));
  }
}

export class CommerceRechargesPackagesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/recharges/packages`));
  }
}

export class CommerceRechargesPackagesApi {
  private client: HttpClient;
  public readonly management: CommerceRechargesPackagesManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceRechargesPackagesManagementApi(client);
  }


/** Create */
  async create(): Promise<RechargesPackagesCreateResult> {
    return this.client.post<RechargesPackagesCreateResult>(backendApiPath(`/recharges/packages`));
  }

/** Delete */
  async delete(packageId: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/recharges/packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(packageId: string): Promise<RechargesPackagesUpdateResult> {
    return this.client.patch<RechargesPackagesUpdateResult>(backendApiPath(`/recharges/packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}`));
  }
}

export class CommerceRechargesOrdersManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/recharges/orders`));
  }

/** Retrieve */
  async retrieve(orderId: string): Promise<RechargesOrdersManagementRetrieveResult> {
    return this.client.get<RechargesOrdersManagementRetrieveResult>(backendApiPath(`/recharges/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`));
  }
}

export class CommerceRechargesOrdersApi {
  private client: HttpClient;
  public readonly management: CommerceRechargesOrdersManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceRechargesOrdersManagementApi(client);
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

export class CommercePaymentsWebhookEventsReplaysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(eventId: string): Promise<PaymentsWebhookEventsReplaysCreateResult> {
    return this.client.post<PaymentsWebhookEventsReplaysCreateResult>(backendApiPath(`/payments/webhook_events/${serializePathParameter(eventId, { name: 'eventId', style: 'simple', explode: false })}/replays`));
  }
}

export class CommercePaymentsWebhookEventsApi {
  private client: HttpClient;
  public readonly replays: CommercePaymentsWebhookEventsReplaysApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.replays = new CommercePaymentsWebhookEventsReplaysApi(client);
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/payments/webhook_events`));
  }
}

export class CommercePaymentsRuntimeSnapshotApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<PaymentsRuntimeSnapshotRetrieveResult> {
    return this.client.get<PaymentsRuntimeSnapshotRetrieveResult>(backendApiPath(`/payments/runtime/snapshot`));
  }
}

export class CommercePaymentsRuntimeApi {
  private client: HttpClient;
  public readonly snapshot: CommercePaymentsRuntimeSnapshotApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.snapshot = new CommercePaymentsRuntimeSnapshotApi(client);
  }

}

export class CommercePaymentsRouteRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/payments/route_rules`));
  }

/** Create */
  async create(): Promise<PaymentsRouteRulesCreateResult> {
    return this.client.post<PaymentsRouteRulesCreateResult>(backendApiPath(`/payments/route_rules`));
  }

/** Update */
  async update(routeRuleId: string): Promise<PaymentsRouteRulesUpdateResult> {
    return this.client.patch<PaymentsRouteRulesUpdateResult>(backendApiPath(`/payments/route_rules/${serializePathParameter(routeRuleId, { name: 'routeRuleId', style: 'simple', explode: false })}`));
  }
}

export class CommercePaymentsReconciliationRunsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/payments/reconciliation_runs`));
  }

/** Create */
  async create(): Promise<PaymentsReconciliationRunsCreateResult> {
    return this.client.post<PaymentsReconciliationRunsCreateResult>(backendApiPath(`/payments/reconciliation_runs`));
  }
}

export class CommercePaymentsProvidersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/payments/providers`));
  }

/** Update */
  async update(providerCode: string): Promise<PaymentsProvidersUpdateResult> {
    return this.client.patch<PaymentsProvidersUpdateResult>(backendApiPath(`/payments/providers/${serializePathParameter(providerCode, { name: 'providerCode', style: 'simple', explode: false })}`));
  }
}

export class CommercePaymentsProviderAccountsStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(providerAccountId: string): Promise<PaymentsProviderAccountsStatusUpdateResult> {
    return this.client.patch<PaymentsProviderAccountsStatusUpdateResult>(backendApiPath(`/payments/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}/status`));
  }
}

export class CommercePaymentsProviderAccountsApi {
  private client: HttpClient;
  public readonly status: CommercePaymentsProviderAccountsStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.status = new CommercePaymentsProviderAccountsStatusApi(client);
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/payments/provider_accounts`));
  }

/** Create */
  async create(): Promise<PaymentsProviderAccountsCreateResult> {
    return this.client.post<PaymentsProviderAccountsCreateResult>(backendApiPath(`/payments/provider_accounts`));
  }

/** Delete */
  async delete(providerAccountId: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/payments/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(providerAccountId: string): Promise<PaymentsProviderAccountsUpdateResult> {
    return this.client.patch<PaymentsProviderAccountsUpdateResult>(backendApiPath(`/payments/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}`));
  }
}

export class CommercePaymentsMethodsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/payments/methods`));
  }
}

export class CommercePaymentsMethodsApi {
  private client: HttpClient;
  public readonly management: CommercePaymentsMethodsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommercePaymentsMethodsManagementApi(client);
  }


/** Create */
  async create(): Promise<PaymentsMethodsCreateResult> {
    return this.client.post<PaymentsMethodsCreateResult>(backendApiPath(`/payments/methods`));
  }

/** Update */
  async update(methodId: string): Promise<PaymentsMethodsUpdateResult> {
    return this.client.patch<PaymentsMethodsUpdateResult>(backendApiPath(`/payments/methods/${serializePathParameter(methodId, { name: 'methodId', style: 'simple', explode: false })}`));
  }
}

export class CommercePaymentsIntentsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(paymentIntentId: string): Promise<PaymentsIntentsManagementRetrieveResult> {
    return this.client.get<PaymentsIntentsManagementRetrieveResult>(backendApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}`));
  }
}

export class CommercePaymentsIntentsApi {
  private client: HttpClient;
  public readonly management: CommercePaymentsIntentsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommercePaymentsIntentsManagementApi(client);
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/payments/intents`));
  }
}

export class CommercePaymentsDisputesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/payments/disputes`));
  }
}

export class CommercePaymentsChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/payments/channels`));
  }

/** Create */
  async create(): Promise<PaymentsChannelsCreateResult> {
    return this.client.post<PaymentsChannelsCreateResult>(backendApiPath(`/payments/channels`));
  }

/** Update */
  async update(channelId: string): Promise<PaymentsChannelsUpdateResult> {
    return this.client.patch<PaymentsChannelsUpdateResult>(backendApiPath(`/payments/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}`));
  }
}

export class CommercePaymentsAttemptsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/payments/attempts`));
  }
}

export class CommercePaymentsApi {
  private client: HttpClient;
  public readonly attempts: CommercePaymentsAttemptsApi;
  public readonly channels: CommercePaymentsChannelsApi;
  public readonly disputes: CommercePaymentsDisputesApi;
  public readonly intents: CommercePaymentsIntentsApi;
  public readonly methods: CommercePaymentsMethodsApi;
  public readonly providerAccounts: CommercePaymentsProviderAccountsApi;
  public readonly providers: CommercePaymentsProvidersApi;
  public readonly reconciliationRuns: CommercePaymentsReconciliationRunsApi;
  public readonly routeRules: CommercePaymentsRouteRulesApi;
  public readonly runtime: CommercePaymentsRuntimeApi;
  public readonly webhookEvents: CommercePaymentsWebhookEventsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.attempts = new CommercePaymentsAttemptsApi(client);
    this.channels = new CommercePaymentsChannelsApi(client);
    this.disputes = new CommercePaymentsDisputesApi(client);
    this.intents = new CommercePaymentsIntentsApi(client);
    this.methods = new CommercePaymentsMethodsApi(client);
    this.providerAccounts = new CommercePaymentsProviderAccountsApi(client);
    this.providers = new CommercePaymentsProvidersApi(client);
    this.reconciliationRuns = new CommercePaymentsReconciliationRunsApi(client);
    this.routeRules = new CommercePaymentsRouteRulesApi(client);
    this.runtime = new CommercePaymentsRuntimeApi(client);
    this.webhookEvents = new CommercePaymentsWebhookEventsApi(client);
  }

}

export class CommerceOrdersEventsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(orderId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/events`));
  }
}

export class CommerceOrdersEventsApi {
  private client: HttpClient;
  public readonly management: CommerceOrdersEventsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceOrdersEventsManagementApi(client);
  }

}

export class CommerceOrdersCancellationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/orders/cancellations`));
  }
}

export class CommerceOrdersManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/orders`));
  }

/** Retrieve */
  async retrieve(orderId: string): Promise<OrdersManagementRetrieveResult> {
    return this.client.get<OrdersManagementRetrieveResult>(backendApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`));
  }

/** Cancel */
  async cancel(orderId: string): Promise<OrdersManagementCancelResult> {
    return this.client.post<OrdersManagementCancelResult>(backendApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/cancel`));
  }

/** Close */
  async close(orderId: string): Promise<OrdersManagementCloseResult> {
    return this.client.post<OrdersManagementCloseResult>(backendApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/close`));
  }
}

export class CommerceOrdersApi {
  private client: HttpClient;
  public readonly management: CommerceOrdersManagementApi;
  public readonly cancellations: CommerceOrdersCancellationsApi;
  public readonly events: CommerceOrdersEventsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceOrdersManagementApi(client);
    this.cancellations = new CommerceOrdersCancellationsApi(client);
    this.events = new CommerceOrdersEventsApi(client);
  }

}

export class CommerceMembershipsPlansManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/memberships/plans`));
  }
}

export class CommerceMembershipsPlansApi {
  private client: HttpClient;
  public readonly management: CommerceMembershipsPlansManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceMembershipsPlansManagementApi(client);
  }


/** Create */
  async create(): Promise<MembershipsPlansCreateResult> {
    return this.client.post<MembershipsPlansCreateResult>(backendApiPath(`/memberships/plans`));
  }

/** Update */
  async update(planId: string): Promise<MembershipsPlansUpdateResult> {
    return this.client.patch<MembershipsPlansUpdateResult>(backendApiPath(`/memberships/plans/${serializePathParameter(planId, { name: 'planId', style: 'simple', explode: false })}`));
  }
}

export class CommerceMembershipsPackagesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/memberships/packages`));
  }
}

export class CommerceMembershipsPackagesApi {
  private client: HttpClient;
  public readonly management: CommerceMembershipsPackagesManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceMembershipsPackagesManagementApi(client);
  }


/** Create */
  async create(): Promise<MembershipsPackagesCreateResult> {
    return this.client.post<MembershipsPackagesCreateResult>(backendApiPath(`/memberships/packages`));
  }

/** Delete */
  async delete(packageId: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/memberships/packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(packageId: string): Promise<MembershipsPackagesUpdateResult> {
    return this.client.patch<MembershipsPackagesUpdateResult>(backendApiPath(`/memberships/packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}`));
  }
}

export class CommerceMembershipsPackageGroupsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/memberships/package_groups`));
  }
}

export class CommerceMembershipsPackageGroupsApi {
  private client: HttpClient;
  public readonly management: CommerceMembershipsPackageGroupsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceMembershipsPackageGroupsManagementApi(client);
  }


/** Create */
  async create(): Promise<MembershipsPackageGroupsCreateResult> {
    return this.client.post<MembershipsPackageGroupsCreateResult>(backendApiPath(`/memberships/package_groups`));
  }

/** Delete */
  async delete(packageGroupId: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(packageGroupId: string): Promise<MembershipsPackageGroupsUpdateResult> {
    return this.client.patch<MembershipsPackageGroupsUpdateResult>(backendApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}`));
  }
}

export class CommerceMembershipsMembersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/memberships/members`));
  }

/** Update */
  async update(membershipId: string): Promise<MembershipsMembersUpdateResult> {
    return this.client.patch<MembershipsMembersUpdateResult>(backendApiPath(`/memberships/members/${serializePathParameter(membershipId, { name: 'membershipId', style: 'simple', explode: false })}`));
  }
}

export class CommerceMembershipsEntitlementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/memberships/entitlements`));
  }
}

export class CommerceMembershipsApi {
  private client: HttpClient;
  public readonly entitlements: CommerceMembershipsEntitlementsApi;
  public readonly members: CommerceMembershipsMembersApi;
  public readonly packageGroups: CommerceMembershipsPackageGroupsApi;
  public readonly packages: CommerceMembershipsPackagesApi;
  public readonly plans: CommerceMembershipsPlansApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.entitlements = new CommerceMembershipsEntitlementsApi(client);
    this.members = new CommerceMembershipsMembersApi(client);
    this.packageGroups = new CommerceMembershipsPackageGroupsApi(client);
    this.packages = new CommerceMembershipsPackagesApi(client);
    this.plans = new CommerceMembershipsPlansApi(client);
  }

}

export class CommerceInvoicesVoidsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(invoiceId: string): Promise<InvoicesVoidsCreateResult> {
    return this.client.post<InvoicesVoidsCreateResult>(backendApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}/voids`));
  }
}

export class CommerceInvoicesIssuancesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(invoiceId: string): Promise<InvoicesIssuancesCreateResult> {
    return this.client.post<InvoicesIssuancesCreateResult>(backendApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}/issuances`));
  }
}

export class CommerceInvoicesTitlesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/invoices/titles`));
  }
}

export class CommerceInvoicesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/invoices`));
  }

/** Retrieve */
  async retrieve(invoiceId: string): Promise<InvoicesManagementRetrieveResult> {
    return this.client.get<InvoicesManagementRetrieveResult>(backendApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}`));
  }
}

export class CommerceInvoicesApi {
  private client: HttpClient;
  public readonly management: CommerceInvoicesManagementApi;
  public readonly titles: CommerceInvoicesTitlesApi;
  public readonly issuances: CommerceInvoicesIssuancesApi;
  public readonly voids: CommerceInvoicesVoidsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceInvoicesManagementApi(client);
    this.titles = new CommerceInvoicesTitlesApi(client);
    this.issuances = new CommerceInvoicesIssuancesApi(client);
    this.voids = new CommerceInvoicesVoidsApi(client);
  }

}

export class CommerceInventoryStocksApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/inventory/stocks`));
  }

/** Update */
  async update(stockId: string): Promise<InventoryStocksUpdateResult> {
    return this.client.patch<InventoryStocksUpdateResult>(backendApiPath(`/inventory/stocks/${serializePathParameter(stockId, { name: 'stockId', style: 'simple', explode: false })}`));
  }
}

export class CommerceInventoryReservationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/inventory/reservations`));
  }
}

export class CommerceInventoryMovementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/inventory/movements`));
  }
}

export class CommerceInventoryApi {
  private client: HttpClient;
  public readonly movements: CommerceInventoryMovementsApi;
  public readonly reservations: CommerceInventoryReservationsApi;
  public readonly stocks: CommerceInventoryStocksApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.movements = new CommerceInventoryMovementsApi(client);
    this.reservations = new CommerceInventoryReservationsApi(client);
    this.stocks = new CommerceInventoryStocksApi(client);
  }

}

export class CommerceFulfillmentsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/fulfillments`));
  }

/** Retrieve */
  async retrieve(fulfillmentId: string): Promise<FulfillmentsManagementRetrieveResult> {
    return this.client.get<FulfillmentsManagementRetrieveResult>(backendApiPath(`/fulfillments/${serializePathParameter(fulfillmentId, { name: 'fulfillmentId', style: 'simple', explode: false })}`));
  }
}

export class CommerceFulfillmentsApi {
  private client: HttpClient;
  public readonly management: CommerceFulfillmentsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceFulfillmentsManagementApi(client);
  }


/** Update */
  async update(fulfillmentId: string): Promise<FulfillmentsUpdateResult> {
    return this.client.patch<FulfillmentsUpdateResult>(backendApiPath(`/fulfillments/${serializePathParameter(fulfillmentId, { name: 'fulfillmentId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCommerceReportsUsageStatementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/commerce_reports/usage_statements`));
  }
}

export class CommerceCommerceReportsRefundsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/commerce_reports/refunds`));
  }
}

export class CommerceCommerceReportsPaymentReconciliationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<CommerceReportsPaymentReconciliationRetrieveResult> {
    return this.client.get<CommerceReportsPaymentReconciliationRetrieveResult>(backendApiPath(`/commerce_reports/payment_reconciliation`));
  }
}

export class CommerceCommerceReportsOrderRevenueApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/commerce_reports/order_revenue`));
  }
}

export class CommerceCommerceReportsApi {
  private client: HttpClient;
  public readonly orderRevenue: CommerceCommerceReportsOrderRevenueApi;
  public readonly paymentReconciliation: CommerceCommerceReportsPaymentReconciliationApi;
  public readonly refunds: CommerceCommerceReportsRefundsApi;
  public readonly usageStatements: CommerceCommerceReportsUsageStatementsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.orderRevenue = new CommerceCommerceReportsOrderRevenueApi(client);
    this.paymentReconciliation = new CommerceCommerceReportsPaymentReconciliationApi(client);
    this.refunds = new CommerceCommerceReportsRefundsApi(client);
    this.usageStatements = new CommerceCommerceReportsUsageStatementsApi(client);
  }

}

export class CommerceCatalogSpusManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/catalog/spus`));
  }
}

export class CommerceCatalogSpusApi {
  private client: HttpClient;
  public readonly management: CommerceCatalogSpusManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceCatalogSpusManagementApi(client);
  }


/** Create */
  async create(): Promise<CatalogSpusCreateResult> {
    return this.client.post<CatalogSpusCreateResult>(backendApiPath(`/catalog/spus`));
  }

/** Update */
  async update(spuId: string): Promise<CatalogSpusUpdateResult> {
    return this.client.patch<CatalogSpusUpdateResult>(backendApiPath(`/catalog/spus/${serializePathParameter(spuId, { name: 'spuId', style: 'simple', explode: false })}`));
  }

/** Archive */
  async archive(spuId: string): Promise<CatalogSpusArchiveResult> {
    return this.client.post<CatalogSpusArchiveResult>(backendApiPath(`/catalog/spus/${serializePathParameter(spuId, { name: 'spuId', style: 'simple', explode: false })}/archive`));
  }

/** Publish */
  async publish(spuId: string): Promise<CatalogSpusPublishResult> {
    return this.client.post<CatalogSpusPublishResult>(backendApiPath(`/catalog/spus/${serializePathParameter(spuId, { name: 'spuId', style: 'simple', explode: false })}/publish`));
  }
}

export class CommerceCatalogSkusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/catalog/skus`));
  }

/** Create */
  async create(): Promise<CatalogSkusCreateResult> {
    return this.client.post<CatalogSkusCreateResult>(backendApiPath(`/catalog/skus`));
  }

/** Delete */
  async delete(skuId: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/catalog/skus/${serializePathParameter(skuId, { name: 'skuId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(skuId: string): Promise<CatalogSkusUpdateResult> {
    return this.client.patch<CatalogSkusUpdateResult>(backendApiPath(`/catalog/skus/${serializePathParameter(skuId, { name: 'skuId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCatalogProductsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/catalog/products`));
  }

/** Retrieve */
  async retrieve(productId: string): Promise<CatalogProductsManagementRetrieveResult> {
    return this.client.get<CatalogProductsManagementRetrieveResult>(backendApiPath(`/catalog/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCatalogProductsApi {
  private client: HttpClient;
  public readonly management: CommerceCatalogProductsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceCatalogProductsManagementApi(client);
  }


/** Create */
  async create(): Promise<CatalogProductsCreateResult> {
    return this.client.post<CatalogProductsCreateResult>(backendApiPath(`/catalog/products`));
  }

/** Delete */
  async delete(productId: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/catalog/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(productId: string): Promise<CatalogProductsUpdateResult> {
    return this.client.patch<CatalogProductsUpdateResult>(backendApiPath(`/catalog/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCatalogPriceListsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/catalog/price_lists`));
  }

/** Create */
  async create(): Promise<Record<string, unknown>> {
    return this.client.post<Record<string, unknown>>(backendApiPath(`/catalog/price_lists`));
  }

/** Update */
  async update(priceListId: string): Promise<Record<string, unknown>> {
    return this.client.patch<Record<string, unknown>>(backendApiPath(`/catalog/price_lists/${serializePathParameter(priceListId, { name: 'priceListId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCatalogCategorySeedsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<CatalogCategorySeedsCreateResult> {
    return this.client.post<CatalogCategorySeedsCreateResult>(backendApiPath(`/catalog/category_seeds/initialize`));
  }
}

export class CommerceCatalogCategoryAttributesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/catalog/category_attributes`));
  }

/** Create */
  async create(): Promise<CatalogCategoryAttributesCreateResult> {
    return this.client.post<CatalogCategoryAttributesCreateResult>(backendApiPath(`/catalog/category_attributes`));
  }

/** Delete */
  async delete(bindingId: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/catalog/category_attributes/${serializePathParameter(bindingId, { name: 'bindingId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(bindingId: string): Promise<CatalogCategoryAttributesUpdateResult> {
    return this.client.patch<CatalogCategoryAttributesUpdateResult>(backendApiPath(`/catalog/category_attributes/${serializePathParameter(bindingId, { name: 'bindingId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCatalogCategoriesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/catalog/categories`));
  }
}

export class CommerceCatalogCategoriesApi {
  private client: HttpClient;
  public readonly management: CommerceCatalogCategoriesManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceCatalogCategoriesManagementApi(client);
  }


/** Create */
  async create(): Promise<CatalogCategoriesCreateResult> {
    return this.client.post<CatalogCategoriesCreateResult>(backendApiPath(`/catalog/categories`));
  }

/** Delete */
  async delete(categoryId: string): Promise<Record<string, unknown>> {
    return this.client.delete<Record<string, unknown>>(backendApiPath(`/catalog/categories/${serializePathParameter(categoryId, { name: 'categoryId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(categoryId: string): Promise<CatalogCategoriesUpdateResult> {
    return this.client.patch<CatalogCategoriesUpdateResult>(backendApiPath(`/catalog/categories/${serializePathParameter(categoryId, { name: 'categoryId', style: 'simple', explode: false })}`));
  }
}

export class CommerceCatalogAttributesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/catalog/attributes`));
  }
}

export class CommerceCatalogAttributesApi {
  private client: HttpClient;
  public readonly management: CommerceCatalogAttributesManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CommerceCatalogAttributesManagementApi(client);
  }


/** Create */
  async create(): Promise<CatalogAttributesCreateResult> {
    return this.client.post<CatalogAttributesCreateResult>(backendApiPath(`/catalog/attributes`));
  }
}

export class CommerceCatalogApi {
  private client: HttpClient;
  public readonly attributes: CommerceCatalogAttributesApi;
  public readonly categories: CommerceCatalogCategoriesApi;
  public readonly categoryAttributes: CommerceCatalogCategoryAttributesApi;
  public readonly categorySeeds: CommerceCatalogCategorySeedsApi;
  public readonly priceLists: CommerceCatalogPriceListsApi;
  public readonly products: CommerceCatalogProductsApi;
  public readonly skus: CommerceCatalogSkusApi;
  public readonly spus: CommerceCatalogSpusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.attributes = new CommerceCatalogAttributesApi(client);
    this.categories = new CommerceCatalogCategoriesApi(client);
    this.categoryAttributes = new CommerceCatalogCategoryAttributesApi(client);
    this.categorySeeds = new CommerceCatalogCategorySeedsApi(client);
    this.priceLists = new CommerceCatalogPriceListsApi(client);
    this.products = new CommerceCatalogProductsApi(client);
    this.skus = new CommerceCatalogSkusApi(client);
    this.spus = new CommerceCatalogSpusApi(client);
  }

}

export class CommerceAuditCommerceEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/audit/commerce_events`));
  }
}

export class CommerceAuditApi {
  private client: HttpClient;
  public readonly commerceEvents: CommerceAuditCommerceEventsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.commerceEvents = new CommerceAuditCommerceEventsApi(client);
  }

}

export class CommerceApi {
  private client: HttpClient;
  public readonly audit: CommerceAuditApi;
  public readonly catalog: CommerceCatalogApi;
  public readonly commerceReports: CommerceCommerceReportsApi;
  public readonly fulfillments: CommerceFulfillmentsApi;
  public readonly inventory: CommerceInventoryApi;
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
    this.audit = new CommerceAuditApi(client);
    this.catalog = new CommerceCatalogApi(client);
    this.commerceReports = new CommerceCommerceReportsApi(client);
    this.fulfillments = new CommerceFulfillmentsApi(client);
    this.inventory = new CommerceInventoryApi(client);
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
