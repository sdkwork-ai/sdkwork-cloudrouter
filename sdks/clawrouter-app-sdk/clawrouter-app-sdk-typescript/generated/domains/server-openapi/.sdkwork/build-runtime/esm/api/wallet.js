import { appApiPath } from './paths';
export class WalletWithdrawalTransfersApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/wallet/withdrawal_transfers`));
    }
}
export class WalletTransactionsApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/wallet/transactions`));
    }
    /** Retrieve */
    async retrieve(transactionId) {
        return this.client.get(appApiPath(`/wallet/transactions/${serializePathParameter(transactionId, { name: 'transactionId', style: 'simple', explode: false })}`));
    }
}
export class WalletTopupTransfersApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/wallet/topup_transfers`));
    }
}
export class WalletTokensApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/wallet/tokens`));
    }
}
export class WalletRequestsApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve(requestNo) {
        return this.client.get(appApiPath(`/wallet/requests/${serializePathParameter(requestNo, { name: 'requestNo', style: 'simple', explode: false })}`));
    }
}
export class WalletPointsExchangeRulesApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/wallet/points/exchanges/rules`));
    }
}
export class WalletPointsApi {
    constructor(client) {
        this.client = client;
        this.exchangeRules = new WalletPointsExchangeRulesApi(client);
    }
}
export class WalletPointTransfersApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/wallet/point_transfers`));
    }
}
export class WalletPointExchangesApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/wallet/point_exchanges`));
    }
    /** Retrieve */
    async retrieve(exchangeNo) {
        return this.client.get(appApiPath(`/wallet/point_exchanges/${serializePathParameter(exchangeNo, { name: 'exchangeNo', style: 'simple', explode: false })}`));
    }
}
export class WalletOverviewApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/wallet/overview`));
    }
}
export class WalletLedgerEntriesPointsApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/wallet/ledger_entries/points`));
    }
}
export class WalletLedgerEntriesApi {
    constructor(client) {
        this.client = client;
        this.points = new WalletLedgerEntriesPointsApi(client);
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/wallet/ledger_entries`));
    }
    /** Retrieve */
    async retrieve(ledgerEntryId) {
        return this.client.get(appApiPath(`/wallet/ledger_entries/${serializePathParameter(ledgerEntryId, { name: 'ledgerEntryId', style: 'simple', explode: false })}`));
    }
}
export class WalletHoldsSettlementsApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/wallet/holds/settlements`));
    }
}
export class WalletHoldsReleasesApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/wallet/holds/releases`));
    }
}
export class WalletHoldsApi {
    constructor(client) {
        this.client = client;
        this.releases = new WalletHoldsReleasesApi(client);
        this.settlements = new WalletHoldsSettlementsApi(client);
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/wallet/holds`));
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/wallet/holds`));
    }
}
export class WalletExchangeRulesApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/wallet/exchange_rules`));
    }
}
export class WalletExchangeRateApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/wallet/exchange_rate`));
    }
}
export class WalletAdjustmentsApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/wallet/adjustments`));
    }
}
export class WalletAccountsTokensApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/wallet/accounts/tokens`));
    }
}
export class WalletAccountsPointsApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/wallet/accounts/points`));
    }
}
export class WalletAccountsOverviewApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/wallet/accounts/overview`));
    }
}
export class WalletAccountsCashApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/wallet/accounts/cash`));
    }
}
export class WalletAccountsApi {
    constructor(client) {
        this.client = client;
        this.cash = new WalletAccountsCashApi(client);
        this.overview = new WalletAccountsOverviewApi(client);
        this.points = new WalletAccountsPointsApi(client);
        this.tokens = new WalletAccountsTokensApi(client);
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/wallet/accounts`));
    }
    /** Retrieve */
    async retrieve(accountId) {
        return this.client.get(appApiPath(`/wallet/accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`));
    }
}
export class WalletApi {
    constructor(client) {
        this.client = client;
        this.accounts = new WalletAccountsApi(client);
        this.adjustments = new WalletAdjustmentsApi(client);
        this.exchangeRate = new WalletExchangeRateApi(client);
        this.exchangeRules = new WalletExchangeRulesApi(client);
        this.holds = new WalletHoldsApi(client);
        this.ledgerEntries = new WalletLedgerEntriesApi(client);
        this.overview = new WalletOverviewApi(client);
        this.pointExchanges = new WalletPointExchangesApi(client);
        this.pointTransfers = new WalletPointTransfersApi(client);
        this.points = new WalletPointsApi(client);
        this.requests = new WalletRequestsApi(client);
        this.tokens = new WalletTokensApi(client);
        this.topupTransfers = new WalletTopupTransfersApi(client);
        this.transactions = new WalletTransactionsApi(client);
        this.withdrawalTransfers = new WalletWithdrawalTransfersApi(client);
    }
}
export function createWalletApi(client) {
    return new WalletApi(client);
}
function appendQueryString(path, rawQueryString) {
    const query = rawQueryString.replace(/^\?+/, '');
    if (!query) {
        return path;
    }
    return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
function serializePathParameter(value, spec) {
    if (value === undefined || value === null) {
        return '';
    }
    const style = spec.style || 'simple';
    if (Array.isArray(value)) {
        return serializePathArray(spec.name, value, style, spec.explode);
    }
    if (typeof value === 'object') {
        return serializePathObject(spec.name, value, style, spec.explode);
    }
    return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}
function serializePathArray(name, values, style, explode) {
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
function serializePathObject(name, value, style, explode) {
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
function pathPrefix(name, style, _objectValue) {
    if (style === 'label')
        return '.';
    if (style === 'matrix')
        return `;${name}`;
    return '';
}
function encodePathValue(value) {
    return encodeURIComponent(value);
}
function serializePathPrimitive(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}
