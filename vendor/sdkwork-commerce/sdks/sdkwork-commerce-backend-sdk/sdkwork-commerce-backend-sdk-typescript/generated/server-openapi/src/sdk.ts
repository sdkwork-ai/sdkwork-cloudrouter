import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkBackendConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { ShopsApi, createShopsApi } from './api/shops';
import { CatalogApi, createCatalogApi } from './api/catalog';
import { InventoryApi, createInventoryApi } from './api/inventory';
import { OrdersApi, createOrdersApi } from './api/orders';
import { PaymentsApi, createPaymentsApi } from './api/payments';
import { RefundsApi, createRefundsApi } from './api/refunds';
import { AfterSalesApi, createAfterSalesApi } from './api/after-sales';
import { FulfillmentsApi, createFulfillmentsApi } from './api/fulfillments';
import { ShipmentsApi, createShipmentsApi } from './api/shipments';
import { EntitlementsApi, createEntitlementsApi } from './api/entitlements';
import { MembershipsApi, createMembershipsApi } from './api/memberships';
import { RechargesApi, createRechargesApi } from './api/recharges';
import { WalletApi, createWalletApi } from './api/wallet';
import { PromotionsApi, createPromotionsApi } from './api/promotions';
import { InvoicesApi, createInvoicesApi } from './api/invoices';
import { CommerceReportsApi, createCommerceReportsApi } from './api/commerce-reports';
import { ReportsApi, createReportsApi } from './api/reports';
import { AuditApi, createAuditApi } from './api/audit';

export class SdkworkBackendClient {
  private httpClient: HttpClient;

  public readonly shops: ShopsApi;
  public readonly catalog: CatalogApi;
  public readonly inventory: InventoryApi;
  public readonly orders: OrdersApi;
  public readonly payments: PaymentsApi;
  public readonly refunds: RefundsApi;
  public readonly afterSales: AfterSalesApi;
  public readonly fulfillments: FulfillmentsApi;
  public readonly shipments: ShipmentsApi;
  public readonly entitlements: EntitlementsApi;
  public readonly memberships: MembershipsApi;
  public readonly recharges: RechargesApi;
  public readonly wallet: WalletApi;
  public readonly promotions: PromotionsApi;
  public readonly invoices: InvoicesApi;
  public readonly commerceReports: CommerceReportsApi;
  public readonly reports: ReportsApi;
  public readonly audit: AuditApi;

  constructor(config: SdkworkBackendConfig) {
    this.httpClient = createHttpClient(config);
    this.shops = createShopsApi(this.httpClient);

    this.catalog = createCatalogApi(this.httpClient);

    this.inventory = createInventoryApi(this.httpClient);

    this.orders = createOrdersApi(this.httpClient);

    this.payments = createPaymentsApi(this.httpClient);

    this.refunds = createRefundsApi(this.httpClient);

    this.afterSales = createAfterSalesApi(this.httpClient);

    this.fulfillments = createFulfillmentsApi(this.httpClient);

    this.shipments = createShipmentsApi(this.httpClient);

    this.entitlements = createEntitlementsApi(this.httpClient);

    this.memberships = createMembershipsApi(this.httpClient);

    this.recharges = createRechargesApi(this.httpClient);

    this.wallet = createWalletApi(this.httpClient);

    this.promotions = createPromotionsApi(this.httpClient);

    this.invoices = createInvoicesApi(this.httpClient);

    this.commerceReports = createCommerceReportsApi(this.httpClient);

    this.reports = createReportsApi(this.httpClient);

    this.audit = createAuditApi(this.httpClient);
  }
  setAuthToken(token: string): this {
    this.httpClient.setAuthToken(token);
    return this;
  }

  setAccessToken(token: string): this {
    this.httpClient.setAccessToken(token);
    return this;
  }

  setTokenManager(manager: AuthTokenManager): this {
    this.httpClient.setTokenManager(manager);
    return this;
  }

  get http(): HttpClient {
    return this.httpClient;
  }
}

export function createClient(config: SdkworkBackendConfig): SdkworkBackendClient {
  return new SdkworkBackendClient(config);
}

export default SdkworkBackendClient;
