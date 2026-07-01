import { appApiPath } from './paths';
export class AccountsCurrentSummaryApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/accounts/current/summary`));
    }
}
export class AccountsCurrentApi {
    constructor(client) {
        this.client = client;
        this.summary = new AccountsCurrentSummaryApi(client);
    }
}
export class AccountsApi {
    constructor(client) {
        this.client = client;
        this.current = new AccountsCurrentApi(client);
    }
}
export function createAccountsApi(client) {
    return new AccountsApi(client);
}
function appendQueryString(path, rawQueryString) {
    const query = rawQueryString.replace(/^\?+/, '');
    if (!query) {
        return path;
    }
    return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
