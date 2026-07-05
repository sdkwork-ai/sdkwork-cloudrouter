import { appApiPath } from './paths';
export class CheckoutSessionsQuotesApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create(checkoutSessionId) {
        return this.client.post(appApiPath(`/checkout/sessions/${serializePathParameter(checkoutSessionId, { name: 'checkoutSessionId', style: 'simple', explode: false })}/quotes`));
    }
}
export class CheckoutSessionsOrdersApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create(checkoutSessionId) {
        return this.client.post(appApiPath(`/checkout/sessions/${serializePathParameter(checkoutSessionId, { name: 'checkoutSessionId', style: 'simple', explode: false })}/orders`));
    }
}
export class CheckoutSessionsApi {
    constructor(client) {
        this.client = client;
        this.orders = new CheckoutSessionsOrdersApi(client);
        this.quotes = new CheckoutSessionsQuotesApi(client);
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/checkout/sessions`));
    }
    /** Retrieve */
    async retrieve(checkoutSessionId) {
        return this.client.get(appApiPath(`/checkout/sessions/${serializePathParameter(checkoutSessionId, { name: 'checkoutSessionId', style: 'simple', explode: false })}`));
    }
}
export class CheckoutApi {
    constructor(client) {
        this.client = client;
        this.sessions = new CheckoutSessionsApi(client);
    }
}
export function createCheckoutApi(client) {
    return new CheckoutApi(client);
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
