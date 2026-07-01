import { appApiPath } from './paths';
export class RechargesSettingsApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/recharges/settings`));
    }
}
export class RechargesPackagesApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/recharges/packages`));
    }
}
export class RechargesOrdersApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/recharges/orders`));
    }
    /** Retrieve */
    async retrieve(orderId) {
        return this.client.get(appApiPath(`/recharges/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`));
    }
    /** Cancel */
    async cancel(orderId) {
        return this.client.post(appApiPath(`/recharges/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/cancellations`));
    }
}
export class RechargesApi {
    constructor(client) {
        this.client = client;
        this.orders = new RechargesOrdersApi(client);
        this.packages = new RechargesPackagesApi(client);
        this.settings = new RechargesSettingsApi(client);
    }
}
export function createRechargesApi(client) {
    return new RechargesApi(client);
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
