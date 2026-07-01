import { appApiPath } from './paths';
export class InvoicesSubmissionsApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create(invoiceId) {
        return this.client.post(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}/submissions`));
    }
}
export class InvoicesItemsApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list(invoiceId) {
        return this.client.get(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}/items`));
    }
}
export class InvoicesCancellationsApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create(invoiceId) {
        return this.client.post(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}/cancellations`));
    }
}
export class InvoicesStatisticsApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/invoices/statistics`));
    }
}
export class InvoicesMineApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/invoices/current`));
    }
}
export class InvoicesApi {
    constructor(client) {
        this.client = client;
        this.mine = new InvoicesMineApi(client);
        this.statistics = new InvoicesStatisticsApi(client);
        this.cancellations = new InvoicesCancellationsApi(client);
        this.items = new InvoicesItemsApi(client);
        this.submissions = new InvoicesSubmissionsApi(client);
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/invoices`));
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/invoices`));
    }
    /** Retrieve */
    async retrieve(invoiceId) {
        return this.client.get(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}`));
    }
    /** Update */
    async update(invoiceId) {
        return this.client.patch(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}`));
    }
}
export function createInvoicesApi(client) {
    return new InvoicesApi(client);
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
