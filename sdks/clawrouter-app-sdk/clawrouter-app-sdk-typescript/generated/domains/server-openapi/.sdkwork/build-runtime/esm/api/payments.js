import { appApiPath } from './paths';
export class PaymentsStatusApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve by out trade no */
    async retrieveByOutTradeNo(outTradeNo) {
        return this.client.get(appApiPath(`/payments/status/out_trade_no/${serializePathParameter(outTradeNo, { name: 'outTradeNo', style: 'simple', explode: false })}`));
    }
    /** Retrieve */
    async retrieve(paymentId) {
        return this.client.get(appApiPath(`/payments/status/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}`));
    }
}
export class PaymentsStatisticsApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/payments/statistics`));
    }
}
export class PaymentsRecordsApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/payments/records`));
    }
    /** Retrieve */
    async retrieve(paymentId) {
        return this.client.get(appApiPath(`/payments/records/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}`));
    }
}
export class PaymentsMethodsApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/payments/methods`));
    }
}
export class PaymentsIntentsAttemptsApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create(paymentIntentId) {
        return this.client.post(appApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}/attempts`));
    }
}
export class PaymentsIntentsApi {
    constructor(client) {
        this.client = client;
        this.attempts = new PaymentsIntentsAttemptsApi(client);
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/payments/intents`));
    }
    /** Retrieve */
    async retrieve(paymentIntentId) {
        return this.client.get(appApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}`));
    }
    /** Cancel */
    async cancel(paymentIntentId) {
        return this.client.post(appApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}/cancel`));
    }
}
export class PaymentsCheckoutApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve(paymentId) {
        return this.client.get(appApiPath(`/payments/checkout/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}`));
    }
}
export class PaymentsAttemptsApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve(paymentAttemptId) {
        return this.client.get(appApiPath(`/payments/attempts/${serializePathParameter(paymentAttemptId, { name: 'paymentAttemptId', style: 'simple', explode: false })}`));
    }
}
export class PaymentsApi {
    constructor(client) {
        this.client = client;
        this.attempts = new PaymentsAttemptsApi(client);
        this.checkout = new PaymentsCheckoutApi(client);
        this.intents = new PaymentsIntentsApi(client);
        this.methods = new PaymentsMethodsApi(client);
        this.records = new PaymentsRecordsApi(client);
        this.statistics = new PaymentsStatisticsApi(client);
        this.status = new PaymentsStatusApi(client);
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/payments`));
    }
    /** Reconcile */
    async reconcile() {
        return this.client.post(appApiPath(`/payments/reconciliations`));
    }
    /** Close */
    async close(paymentId) {
        return this.client.post(appApiPath(`/payments/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}/close`));
    }
}
export function createPaymentsApi(client) {
    return new PaymentsApi(client);
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
