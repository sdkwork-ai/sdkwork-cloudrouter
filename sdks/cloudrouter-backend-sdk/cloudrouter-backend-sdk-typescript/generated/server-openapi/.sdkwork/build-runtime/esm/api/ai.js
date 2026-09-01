import { backendApiPath } from './paths';
export class AiUpstreamSuppliersResourcesApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List upstream supplier resources */
    async list(supplierId, requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}/resources`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Update upstream supplier resources */
    async update(supplierId, body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}/resources`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
}
export class AiUpstreamSuppliersEndpointsApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List upstream supplier endpoints */
    async list(supplierId, requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}/endpoints`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Update upstream supplier endpoints */
    async update(supplierId, body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}/endpoints`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
}
export class AiUpstreamSuppliersAuthMethodsApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List upstream supplier auth methods */
    async list(supplierId, requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}/auth_methods`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Update upstream supplier auth methods */
    async update(supplierId, body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}/auth_methods`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
}
export class AiUpstreamSuppliersApi {
    client;
    authMethods;
    endpoints;
    resources;
    constructor(client) {
        this.client = client;
        this.authMethods = new AiUpstreamSuppliersAuthMethodsApi(client);
        this.endpoints = new AiUpstreamSuppliersEndpointsApi(client);
        this.resources = new AiUpstreamSuppliersResourcesApi(client);
    }
    /** List upstream suppliers */
    async list(params, requestOptions) {
        const query = buildQueryString([
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/ai/upstream_suppliers`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Create upstream supplier */
    async create(body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_suppliers`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
    /** Delete upstream supplier */
    async delete(supplierId, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
    }
    /** Get upstream supplier */
    async retrieve(supplierId, requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'item' });
    }
    /** Update upstream supplier */
    async update(supplierId, body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
}
export class AiUpstreamResourceCatalogApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List upstream resource catalog */
    async retrieve(requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_resource_catalog`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'data' });
    }
}
export class AiUpstreamAccountsResourcesApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List upstream account resources */
    async list(accountId, requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}/resources`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Update upstream account resources */
    async update(accountId, body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}/resources`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
}
export class AiUpstreamAccountsCredentialsApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List upstream account credentials */
    async list(accountId, params, requestOptions) {
        const query = buildQueryString([
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}/credentials`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Create upstream account credential */
    async create(accountId, body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}/credentials`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
    /** Delete upstream account credential */
    async delete(accountId, credentialId, requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}/credentials/${serializePathParameter(credentialId, { name: 'credentialId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' });
    }
}
export class AiUpstreamAccountsApi {
    client;
    credentials;
    resources;
    constructor(client) {
        this.client = client;
        this.credentials = new AiUpstreamAccountsCredentialsApi(client);
        this.resources = new AiUpstreamAccountsResourcesApi(client);
    }
    /** List upstream accounts */
    async list(params, requestOptions) {
        const query = buildQueryString([
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/ai/upstream_accounts`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Create upstream account */
    async create(body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_accounts`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
    /** Delete upstream account */
    async delete(accountId, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
    }
    /** Get upstream account */
    async retrieve(accountId, requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'item' });
    }
    /** Update upstream account */
    async update(accountId, body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
    /** Verify upstream account */
    async verify(accountId, body, requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}/verify`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
    }
}
export class AiUpstreamAccountGroupsResourcesApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List upstream account group resources */
    async list(accountGroupId, requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}/resources`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Update upstream account group resources */
    async update(accountGroupId, body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}/resources`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
}
export class AiUpstreamAccountGroupsMembersApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List upstream account group members */
    async list(accountGroupId, requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}/members`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Update upstream account group members */
    async update(accountGroupId, body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}/members`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
}
export class AiUpstreamAccountGroupsApi {
    client;
    members;
    resources;
    constructor(client) {
        this.client = client;
        this.members = new AiUpstreamAccountGroupsMembersApi(client);
        this.resources = new AiUpstreamAccountGroupsResourcesApi(client);
    }
    /** List upstream account groups */
    async list(params, requestOptions) {
        const query = buildQueryString([
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/ai/upstream_account_groups`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Create upstream account group */
    async create(body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_account_groups`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
    /** Delete upstream account group */
    async delete(accountGroupId, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
    }
    /** Get upstream account group */
    async retrieve(accountGroupId, requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'item' });
    }
    /** Update upstream account group */
    async update(accountGroupId, body, params, requestOptions) {
        const requestHeaders = buildRequestHeaders({
            'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        }, {});
        return this.client.request(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH', body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
    }
    /** Explain upstream account group route */
    async explain(accountGroupId, body, requestOptions) {
        return this.client.request(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}/route_explain`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
    }
}
export class AiApi {
    upstreamAccountGroups;
    upstreamAccounts;
    upstreamResourceCatalog;
    upstreamSuppliers;
    constructor(client) {
        this.upstreamAccountGroups = new AiUpstreamAccountGroupsApi(client);
        this.upstreamAccounts = new AiUpstreamAccountsApi(client);
        this.upstreamResourceCatalog = new AiUpstreamResourceCatalogApi(client);
        this.upstreamSuppliers = new AiUpstreamSuppliersApi(client);
    }
}
export function createAiApi(client) {
    return new AiApi(client);
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
function buildQueryString(parameters) {
    const pairs = [];
    for (const parameter of parameters) {
        appendSerializedParameter(pairs, parameter);
    }
    return pairs.join('&');
}
function appendSerializedParameter(pairs, parameter) {
    if (parameter.value === undefined || parameter.value === null) {
        return;
    }
    if (parameter.contentType) {
        pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
        return;
    }
    const style = parameter.style || 'form';
    if (style === 'deepObject') {
        appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
        return;
    }
    if (Array.isArray(parameter.value)) {
        appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
        return;
    }
    if (typeof parameter.value === 'object') {
        appendObjectParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
        return;
    }
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}
function appendArrayParameter(pairs, name, value, style, explode, allowReserved) {
    const values = value
        .filter((item) => item !== undefined && item !== null)
        .map((item) => serializePrimitive(item));
    if (values.length === 0) {
        return;
    }
    if (style === 'form' && explode) {
        for (const item of values) {
            pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
        }
        return;
    }
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}
function appendObjectParameter(pairs, name, value, style, explode, allowReserved) {
    const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
    if (entries.length === 0) {
        return;
    }
    if (style === 'form' && explode) {
        for (const [key, entryValue] of entries) {
            pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
        }
        return;
    }
    const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}
function appendDeepObjectParameter(pairs, name, value, allowReserved) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
        return;
    }
    for (const [key, entryValue] of Object.entries(value)) {
        if (entryValue === undefined || entryValue === null) {
            continue;
        }
        pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
}
function serializePrimitive(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}
function encodeQueryComponent(value) {
    return encodeURIComponent(value);
}
function encodeQueryValue(value, allowReserved) {
    const encoded = encodeURIComponent(value);
    if (!allowReserved) {
        return encoded;
    }
    return encoded.replace(/%3A/gi, ':')
        .replace(/%2F/gi, '/')
        .replace(/%3F/gi, '?')
        .replace(/%23/gi, '#')
        .replace(/%5B/gi, '[')
        .replace(/%5D/gi, ']')
        .replace(/%40/gi, '@')
        .replace(/%21/gi, '!')
        .replace(/%24/gi, '$')
        .replace(/%26/gi, '&')
        .replace(/%27/gi, "'")
        .replace(/%28/gi, '(')
        .replace(/%29/gi, ')')
        .replace(/%2A/gi, '*')
        .replace(/%2B/gi, '+')
        .replace(/%2C/gi, ',')
        .replace(/%3B/gi, ';')
        .replace(/%3D/gi, '=');
}
function buildRequestHeaders(headers, cookies = {}) {
    const requestHeaders = {};
    for (const [name, parameter] of Object.entries(headers)) {
        const serialized = serializeParameterValue(parameter);
        if (serialized !== undefined) {
            requestHeaders[name] = serialized;
        }
    }
    const cookieHeader = buildCookieHeader(cookies);
    if (cookieHeader) {
        requestHeaders.Cookie = requestHeaders.Cookie
            ? `${requestHeaders.Cookie}; ${cookieHeader}`
            : cookieHeader;
    }
    return Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined;
}
function buildCookieHeader(cookies) {
    const pairs = [];
    for (const [name, parameter] of Object.entries(cookies)) {
        const serialized = serializeParameterValue(parameter);
        if (serialized !== undefined) {
            pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(serialized)}`);
        }
    }
    return pairs.length > 0 ? pairs.join('; ') : undefined;
}
function serializeParameterValue(parameter) {
    const value = parameter?.value;
    if (value === undefined || value === null) {
        return undefined;
    }
    if (parameter?.contentType) {
        return JSON.stringify(value);
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value.map((item) => serializeHeaderPrimitive(item)).join(',');
    }
    if (typeof value === 'object' && value !== null) {
        return serializeHeaderObject(value, parameter?.explode === true);
    }
    return serializeHeaderPrimitive(value);
}
function serializeHeaderObject(value, explode) {
    const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
    if (explode) {
        return entries.map(([key, entryValue]) => `${key}=${serializeHeaderPrimitive(entryValue)}`).join(',');
    }
    return entries.flatMap(([key, entryValue]) => [key, serializeHeaderPrimitive(entryValue)]).join(',');
}
function serializeHeaderPrimitive(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }
    return String(value);
}
