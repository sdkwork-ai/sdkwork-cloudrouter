import { appApiPath } from './paths';
export class OrdersStatusApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve(orderId) {
        return this.client.get(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/status`));
    }
}
export class OrdersPaymentsOrderPaymentsApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list(orderId) {
        return this.client.get(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/payments`));
    }
}
export class OrdersPaymentsApi {
    constructor(client) {
        this.client = client;
        this.orderPayments = new OrdersPaymentsOrderPaymentsApi(client);
    }
}
export class OrdersPaymentSuccessApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve(orderId) {
        return this.client.get(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/payment_success`));
    }
}
export class OrdersEventsApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list(orderId) {
        return this.client.get(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/events`));
    }
}
export class OrdersCancellationsApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create(orderId) {
        return this.client.post(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/cancellations`));
    }
}
export class OrdersStatisticsApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/orders/statistics`));
    }
}
export class OrdersApi {
    constructor(client) {
        this.client = client;
        this.statistics = new OrdersStatisticsApi(client);
        this.cancellations = new OrdersCancellationsApi(client);
        this.events = new OrdersEventsApi(client);
        this.paymentSuccess = new OrdersPaymentSuccessApi(client);
        this.payments = new OrdersPaymentsApi(client);
        this.status = new OrdersStatusApi(client);
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/orders`));
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/orders`));
    }
    /** Retrieve */
    async retrieve(orderId) {
        return this.client.get(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`));
    }
    /** Cancel */
    async cancel(orderId) {
        return this.client.post(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/cancel`));
    }
    /** Pay */
    async pay(orderId) {
        return this.client.post(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/payments`));
    }
}
export function createOrdersApi(client) {
    return new OrdersApi(client);
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
