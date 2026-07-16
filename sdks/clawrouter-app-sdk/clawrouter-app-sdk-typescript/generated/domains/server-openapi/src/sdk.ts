import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkAppConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { AccountsApi, createAccountsApi } from './api/accounts';
import { AddressesApi, createAddressesApi } from './api/addresses';
import { AfterSalesApi, createAfterSalesApi } from './api/after-sales';
import { BillingApi, createBillingApi } from './api/billing';
import { CartApi, createCartApi } from './api/cart';
import { CatalogApi, createCatalogApi } from './api/catalog';
import { CheckoutApi, createCheckoutApi } from './api/checkout';
import { FulfillmentsApi, createFulfillmentsApi } from './api/fulfillments';
import { InvoicesApi, createInvoicesApi } from './api/invoices';
import { MembershipsApi, createMembershipsApi } from './api/memberships';
import { OrdersApi, createOrdersApi } from './api/orders';
import { PaymentsApi, createPaymentsApi } from './api/payments';
import { PromotionsApi, createPromotionsApi } from './api/promotions';
import { RechargesApi, createRechargesApi } from './api/recharges';
import { RefundsApi, createRefundsApi } from './api/refunds';
import { ShipmentsApi, createShipmentsApi } from './api/shipments';
import { WalletApi, createWalletApi } from './api/wallet';
import { WithdrawalsApi, createWithdrawalsApi } from './api/withdrawals';

export class SdkworkAppClient {
  private httpClient: HttpClient;

  public readonly accounts: AccountsApi;
  public readonly addresses: AddressesApi;
  public readonly afterSales: AfterSalesApi;
  public readonly billing: BillingApi;
  public readonly cart: CartApi;
  public readonly catalog: CatalogApi;
  public readonly checkout: CheckoutApi;
  public readonly fulfillments: FulfillmentsApi;
  public readonly invoices: InvoicesApi;
  public readonly memberships: MembershipsApi;
  public readonly orders: OrdersApi;
  public readonly payments: PaymentsApi;
  public readonly promotions: PromotionsApi;
  public readonly recharges: RechargesApi;
  public readonly refunds: RefundsApi;
  public readonly shipments: ShipmentsApi;
  public readonly wallet: WalletApi;
  public readonly withdrawals: WithdrawalsApi;

  constructor(config: SdkworkAppConfig) {
    this.httpClient = createHttpClient(config);
    this.accounts = createAccountsApi(this.httpClient);

    this.addresses = createAddressesApi(this.httpClient);

    this.afterSales = createAfterSalesApi(this.httpClient);

    this.billing = createBillingApi(this.httpClient);

    this.cart = createCartApi(this.httpClient);

    this.catalog = createCatalogApi(this.httpClient);

    this.checkout = createCheckoutApi(this.httpClient);

    this.fulfillments = createFulfillmentsApi(this.httpClient);

    this.invoices = createInvoicesApi(this.httpClient);

    this.memberships = createMembershipsApi(this.httpClient);

    this.orders = createOrdersApi(this.httpClient);

    this.payments = createPaymentsApi(this.httpClient);

    this.promotions = createPromotionsApi(this.httpClient);

    this.recharges = createRechargesApi(this.httpClient);

    this.refunds = createRefundsApi(this.httpClient);

    this.shipments = createShipmentsApi(this.httpClient);

    this.wallet = createWalletApi(this.httpClient);

    this.withdrawals = createWithdrawalsApi(this.httpClient);
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
