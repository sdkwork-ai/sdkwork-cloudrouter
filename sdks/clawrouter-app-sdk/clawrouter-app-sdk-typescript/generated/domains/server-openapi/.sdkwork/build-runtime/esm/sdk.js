import { createHttpClient } from './http/client';
import { createAccountsApi } from './api/accounts';
import { createAddressesApi } from './api/addresses';
import { createBillingApi } from './api/billing';
import { createCartApi } from './api/cart';
import { createCatalogApi } from './api/catalog';
import { createCheckoutApi } from './api/checkout';
import { createFulfillmentsApi } from './api/fulfillments';
import { createInvoicesApi } from './api/invoices';
import { createMembershipsApi } from './api/memberships';
import { createOrdersApi } from './api/orders';
import { createPaymentsApi } from './api/payments';
import { createPromotionsApi } from './api/promotions';
import { createRechargesApi } from './api/recharges';
import { createRefundsApi } from './api/refunds';
import { createShipmentsApi } from './api/shipments';
import { createWalletApi } from './api/wallet';
export class SdkworkAppClient {
    constructor(config) {
        this.httpClient = createHttpClient(config);
        this.accounts = createAccountsApi(this.httpClient);
        this.addresses = createAddressesApi(this.httpClient);
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
    }
    setAuthToken(token) {
        this.httpClient.setAuthToken(token);
        return this;
    }
    setAccessToken(token) {
        this.httpClient.setAccessToken(token);
        return this;
    }
    setTokenManager(manager) {
        this.httpClient.setTokenManager(manager);
        return this;
    }
    get http() {
        return this.httpClient;
    }
}
export function createClient(config) {
    return new SdkworkAppClient(config);
}
export default SdkworkAppClient;
