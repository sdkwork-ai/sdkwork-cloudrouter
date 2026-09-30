import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkAppConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { AccountsApi, createAccountsApi } from './api/accounts';
import { ShopsApi, createShopsApi } from './api/shops';
import { CatalogApi, createCatalogApi } from './api/catalog';
import { CartApi, createCartApi } from './api/cart';
import { AddressesApi, createAddressesApi } from './api/addresses';
import { CheckoutApi, createCheckoutApi } from './api/checkout';
import { OrdersApi, createOrdersApi } from './api/orders';
import { PaymentsApi, createPaymentsApi } from './api/payments';
import { RefundsApi, createRefundsApi } from './api/refunds';
import { AfterSalesApi, createAfterSalesApi } from './api/after-sales';
import { FulfillmentsApi, createFulfillmentsApi } from './api/fulfillments';
import { ShipmentsApi, createShipmentsApi } from './api/shipments';
import { MembershipsApi, createMembershipsApi } from './api/memberships';
import { RechargesApi, createRechargesApi } from './api/recharges';
import { BillingApi, createBillingApi } from './api/billing';
import { WalletApi, createWalletApi } from './api/wallet';
import { PromotionsApi, createPromotionsApi } from './api/promotions';
import { InvoicesApi, createInvoicesApi } from './api/invoices';

export class SdkworkAppClient {
  private httpClient: HttpClient;

  public readonly accounts: AccountsApi;
  public readonly shops: ShopsApi;
  public readonly catalog: CatalogApi;
  public readonly cart: CartApi;
  public readonly addresses: AddressesApi;
  public readonly checkout: CheckoutApi;
  public readonly orders: OrdersApi;
  public readonly payments: PaymentsApi;
  public readonly refunds: RefundsApi;
  public readonly afterSales: AfterSalesApi;
  public readonly fulfillments: FulfillmentsApi;
  public readonly shipments: ShipmentsApi;
  public readonly memberships: MembershipsApi;
  public readonly recharges: RechargesApi;
  public readonly billing: BillingApi;
  public readonly wallet: WalletApi;
  public readonly promotions: PromotionsApi;
  public readonly invoices: InvoicesApi;

  constructor(config: SdkworkAppConfig) {
    this.httpClient = createHttpClient(config);
    this.accounts = createAccountsApi(this.httpClient);

    this.shops = createShopsApi(this.httpClient);

    this.catalog = createCatalogApi(this.httpClient);

    this.cart = createCartApi(this.httpClient);

    this.addresses = createAddressesApi(this.httpClient);

    this.checkout = createCheckoutApi(this.httpClient);

    this.orders = createOrdersApi(this.httpClient);

    this.payments = createPaymentsApi(this.httpClient);

    this.refunds = createRefundsApi(this.httpClient);

    this.afterSales = createAfterSalesApi(this.httpClient);

    this.fulfillments = createFulfillmentsApi(this.httpClient);

    this.shipments = createShipmentsApi(this.httpClient);

    this.memberships = createMembershipsApi(this.httpClient);

    this.recharges = createRechargesApi(this.httpClient);

    this.billing = createBillingApi(this.httpClient);

    this.wallet = createWalletApi(this.httpClient);

    this.promotions = createPromotionsApi(this.httpClient);

    this.invoices = createInvoicesApi(this.httpClient);
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

export function createClient(config: SdkworkAppConfig): SdkworkAppClient {
  return new SdkworkAppClient(config);
}

export default SdkworkAppClient;
