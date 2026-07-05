import { appApiPath } from './paths';
export class CatalogSpusApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/catalog/spus`));
    }
    /** Retrieve */
    async retrieve(spuId) {
        return this.client.get(appApiPath(`/catalog/spus/${serializePathParameter(spuId, { name: 'spuId', style: 'simple', explode: false })}`));
    }
}
export class CatalogSkusPricesApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve(skuId) {
        return this.client.get(appApiPath(`/catalog/skus/${serializePathParameter(skuId, { name: 'skuId', style: 'simple', explode: false })}/prices`));
    }
}
export class CatalogSkusApi {
    constructor(client) {
        this.client = client;
        this.prices = new CatalogSkusPricesApi(client);
    }
    /** Retrieve */
    async retrieve(skuId) {
        return this.client.get(appApiPath(`/catalog/skus/${serializePathParameter(skuId, { name: 'skuId', style: 'simple', explode: false })}`));
    }
}
export class CatalogProductsApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/catalog/products`));
    }
    /** Retrieve */
    async retrieve(productId) {
        return this.client.get(appApiPath(`/catalog/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}`));
    }
}
export class CatalogCategoriesApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/catalog/categories`));
    }
    /** Retrieve */
    async retrieve(categoryId) {
        return this.client.get(appApiPath(`/catalog/categories/${serializePathParameter(categoryId, { name: 'categoryId', style: 'simple', explode: false })}`));
    }
}
export class CatalogAttributesApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/catalog/attributes`));
    }
}
export class CatalogApi {
    constructor(client) {
        this.client = client;
        this.attributes = new CatalogAttributesApi(client);
        this.categories = new CatalogCategoriesApi(client);
        this.products = new CatalogProductsApi(client);
        this.skus = new CatalogSkusApi(client);
        this.spus = new CatalogSpusApi(client);
    }
}
export function createCatalogApi(client) {
    return new CatalogApi(client);
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
