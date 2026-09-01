import { createHttpClient } from './http/client';
import { createAiApi } from './api/ai';
import { createBillingApi } from './api/billing';
import { createPaymentsApi } from './api/payments';
import { createPricingApi } from './api/pricing';
import { createRechargesApi } from './api/recharges';
import { createStorageApi } from './api/storage';
import { createSystemApi } from './api/system';
export class SdkworkBackendClient {
    httpClient;
    ai;
    billing;
    payments;
    pricing;
    recharges;
    storage;
    system;
    constructor(config) {
        this.httpClient = createHttpClient(config);
        this.ai = createAiApi(this.httpClient);
        this.billing = createBillingApi(this.httpClient);
        this.payments = createPaymentsApi(this.httpClient);
        this.pricing = createPricingApi(this.httpClient);
        this.recharges = createRechargesApi(this.httpClient);
        this.storage = createStorageApi(this.httpClient);
        this.system = createSystemApi(this.httpClient);
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
    return new SdkworkBackendClient(config);
}
export default SdkworkBackendClient;
