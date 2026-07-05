import { appApiPath } from './paths';
export class BillingHistoryApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/billing/history`));
    }
}
export class BillingApi {
    constructor(client) {
        this.client = client;
        this.history = new BillingHistoryApi(client);
    }
}
export function createBillingApi(client) {
    return new BillingApi(client);
}
function appendQueryString(path, rawQueryString) {
    const query = rawQueryString.replace(/^\?+/, '');
    if (!query) {
        return path;
    }
    return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
