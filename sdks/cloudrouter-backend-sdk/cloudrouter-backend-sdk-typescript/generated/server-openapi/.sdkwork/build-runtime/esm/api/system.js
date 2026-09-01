import { backendApiPath } from './paths';
export class SystemSiteSettingsApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List settings */
    async retrieve(requestOptions) {
        return this.client.request(backendApiPath(`/system/site/settings`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'data' });
    }
    /** Update settings */
    async update(body, requestOptions) {
        return this.client.request(backendApiPath(`/system/site/settings`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH', body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemSiteApi {
    settings;
    constructor(client) {
        this.settings = new SystemSiteSettingsApi(client);
    }
}
export class SystemServiceNodesStatusApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** Update node status */
    async update(nodeId, body, requestOptions) {
        return this.client.request(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/status`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT', body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemServiceNodesApi {
    client;
    status;
    constructor(client) {
        this.client = client;
        this.status = new SystemServiceNodesStatusApi(client);
    }
    /** List nodes */
    async list(params, requestOptions) {
        const query = buildQueryString([
            { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
            { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/system/service_nodes`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Create node */
    async create(body, requestOptions) {
        return this.client.request(backendApiPath(`/system/service_nodes`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
    }
    /** Delete node */
    async delete(nodeId, requestOptions) {
        return this.client.request(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' });
    }
    /** Update node */
    async update(nodeId, body, requestOptions) {
        return this.client.request(backendApiPath(`/system/service_nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT', body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemRuntimeRegionSettingsApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List settings */
    async retrieve(requestOptions) {
        return this.client.request(backendApiPath(`/system/runtime_region/settings`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'data' });
    }
    /** Update settings */
    async update(body, requestOptions) {
        return this.client.request(backendApiPath(`/system/runtime_region/settings`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH', body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemRuntimeRegionApi {
    settings;
    constructor(client) {
        this.settings = new SystemRuntimeRegionSettingsApi(client);
    }
}
export class SystemRecordsApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List logs */
    async list(params, requestOptions) {
        const query = buildQueryString([
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'user', value: params?.user, style: 'form', explode: true, allowReserved: false },
            { name: 'token', value: params?.token, style: 'form', explode: true, allowReserved: false },
            { name: 'model', value: params?.model, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/system/records`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
}
export class SystemRateLimitsModelsApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List model limits */
    async list(params, requestOptions) {
        const query = buildQueryString([
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/system/rate_limits/models`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Create model limit */
    async create(body, requestOptions) {
        return this.client.request(backendApiPath(`/system/rate_limits/models`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemRateLimitsIpApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List IP limits */
    async list(params, requestOptions) {
        const query = buildQueryString([
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/system/rate_limits/ip`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Create IP limit */
    async create(body, requestOptions) {
        return this.client.request(backendApiPath(`/system/rate_limits/ip`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemRateLimitsApiKeysApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List token limits */
    async list(params, requestOptions) {
        const query = buildQueryString([
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/system/rate_limits/api_keys`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Create token limit */
    async create(body, requestOptions) {
        return this.client.request(backendApiPath(`/system/rate_limits/api_keys`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemRateLimitsApi {
    apiKeys;
    ip;
    models;
    constructor(client) {
        this.apiKeys = new SystemRateLimitsApiKeysApi(client);
        this.ip = new SystemRateLimitsIpApi(client);
        this.models = new SystemRateLimitsModelsApi(client);
    }
}
export class SystemMonitorPerformanceApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List performance data */
    async list(params, requestOptions) {
        const query = buildQueryString([
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/system/monitor/performance`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
}
export class SystemMonitorNodesApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List nodes */
    async list(params, requestOptions) {
        const query = buildQueryString([
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/system/monitor/nodes`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
}
export class SystemMonitorAlertsApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List alerts */
    async list(params, requestOptions) {
        const query = buildQueryString([
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/system/monitor/alerts`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
}
export class SystemMonitorApi {
    alerts;
    nodes;
    performance;
    constructor(client) {
        this.alerts = new SystemMonitorAlertsApi(client);
        this.nodes = new SystemMonitorNodesApi(client);
        this.performance = new SystemMonitorPerformanceApi(client);
    }
}
export class SystemInstallationStatusApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List installation status */
    async retrieve(requestOptions) {
        return this.client.request(backendApiPath(`/system/installation/status`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemInstallationApi {
    status;
    constructor(client) {
        this.status = new SystemInstallationStatusApi(client);
    }
}
export class SystemFirewallsRulesApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List firewalls */
    async list(params, requestOptions) {
        const query = buildQueryString([
            { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/system/firewalls/rules`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Create firewall */
    async create(body, requestOptions) {
        return this.client.request(backendApiPath(`/system/firewalls/rules`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
    }
    /** Delete firewall */
    async delete(ruleId, requestOptions) {
        return this.client.request(backendApiPath(`/system/firewalls/rules/${serializePathParameter(ruleId, { name: 'ruleId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' });
    }
}
export class SystemFirewallsApi {
    rules;
    constructor(client) {
        this.rules = new SystemFirewallsRulesApi(client);
    }
}
export class SystemDashboardAdminOverviewApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List dashboard data */
    async retrieve(requestOptions) {
        return this.client.request(backendApiPath(`/system/dashboard/admin/overview`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemDashboardAdminApi {
    overview;
    constructor(client) {
        this.overview = new SystemDashboardAdminOverviewApi(client);
    }
}
export class SystemDashboardApi {
    admin;
    constructor(client) {
        this.admin = new SystemDashboardAdminApi(client);
    }
}
export class SystemChainsPolicyApiKeyApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List API key chain policy */
    async retrieve(apiKeyId, requestOptions) {
        return this.client.request(backendApiPath(`/system/chains/policy/keys/${serializePathParameter(apiKeyId, { name: 'apiKeyId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'item' });
    }
}
export class SystemChainsPolicyApi {
    client;
    apiKey;
    constructor(client) {
        this.client = client;
        this.apiKey = new SystemChainsPolicyApiKeyApi(client);
    }
    /** List chain policy */
    async retrieve(requestOptions) {
        return this.client.request(backendApiPath(`/system/chains/policy`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'item' });
    }
    /** Update chain policy */
    async update(body, requestOptions) {
        return this.client.request(backendApiPath(`/system/chains/policy`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH', body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
    }
}
export class SystemChainsApi {
    policy;
    constructor(client) {
        this.policy = new SystemChainsPolicyApi(client);
    }
}
export class SystemCacheOverviewApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List overview */
    async retrieve(requestOptions) {
        return this.client.request(backendApiPath(`/system/cache/overview`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemCacheNamespacesKeysApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List keys */
    async list(namespace_, params, requestOptions) {
        const query = buildQueryString([
            { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
            { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/keys`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'page' });
    }
    /** Delete key */
    async delete(namespace_, key, requestOptions) {
        return this.client.request(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/keys/${serializePathParameter(key, { name: 'key', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' });
    }
}
export class SystemCacheNamespacesApi {
    client;
    keys;
    constructor(client) {
        this.client = client;
        this.keys = new SystemCacheNamespacesKeysApi(client);
    }
    /** Delete namespace */
    async delete(namespace_, requestOptions) {
        return this.client.request(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' });
    }
    /** Refresh namespace */
    async refresh(namespace_, requestOptions) {
        return this.client.request(backendApiPath(`/system/cache/namespaces/${serializePathParameter(namespace_, { name: 'namespace', style: 'simple', explode: false })}/refresh`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemCacheInstancesApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** Delete instance */
    async delete(instanceName, requestOptions) {
        return this.client.request(backendApiPath(`/system/cache/instances/${serializePathParameter(instanceName, { name: 'instanceName', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' });
    }
    /** Refresh instance */
    async refresh(instanceName, requestOptions) {
        return this.client.request(backendApiPath(`/system/cache/instances/${serializePathParameter(instanceName, { name: 'instanceName', style: 'simple', explode: false })}/refresh`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemCacheApi {
    client;
    instances;
    namespaces;
    overview;
    constructor(client) {
        this.client = client;
        this.instances = new SystemCacheInstancesApi(client);
        this.namespaces = new SystemCacheNamespacesApi(client);
        this.overview = new SystemCacheOverviewApi(client);
    }
    /** Refresh all */
    async refresh(requestOptions) {
        return this.client.request(backendApiPath(`/system/cache/refresh`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemAuthSettingsApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List cloud router auth settings */
    async retrieve(requestOptions) {
        return this.client.request(backendApiPath(`/system/auth/settings`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'data' });
    }
    /** Update cloud router auth settings */
    async update(body, requestOptions) {
        return this.client.request(backendApiPath(`/system/auth/settings`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH', body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemAuthApi {
    settings;
    constructor(client) {
        this.settings = new SystemAuthSettingsApi(client);
    }
}
export class SystemAnalyticsAdminOverviewApi {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List overview */
    async retrieve(params, requestOptions) {
        const query = buildQueryString([
            { name: 'time_range', value: params?.timeRange, style: 'form', explode: true, allowReserved: false },
            { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
            { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
            { name: 'ranking_size', value: params?.rankingSize, style: 'form', explode: true, allowReserved: false },
        ]);
        return this.client.request(appendQueryString(backendApiPath(`/system/analytics/admin/overview`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET', sdkworkUnwrapKind: 'data' });
    }
}
export class SystemAnalyticsAdminApi {
    overview;
    constructor(client) {
        this.overview = new SystemAnalyticsAdminOverviewApi(client);
    }
}
export class SystemAnalyticsApi {
    admin;
    constructor(client) {
        this.admin = new SystemAnalyticsAdminApi(client);
    }
}
export class SystemApi {
    analytics;
    auth;
    cache;
    chains;
    dashboard;
    firewalls;
    installation;
    monitor;
    rateLimits;
    records;
    runtimeRegion;
    serviceNodes;
    site;
    constructor(client) {
        this.analytics = new SystemAnalyticsApi(client);
        this.auth = new SystemAuthApi(client);
        this.cache = new SystemCacheApi(client);
        this.chains = new SystemChainsApi(client);
        this.dashboard = new SystemDashboardApi(client);
        this.firewalls = new SystemFirewallsApi(client);
        this.installation = new SystemInstallationApi(client);
        this.monitor = new SystemMonitorApi(client);
        this.rateLimits = new SystemRateLimitsApi(client);
        this.records = new SystemRecordsApi(client);
        this.runtimeRegion = new SystemRuntimeRegionApi(client);
        this.serviceNodes = new SystemServiceNodesApi(client);
        this.site = new SystemSiteApi(client);
    }
}
export function createSystemApi(client) {
    return new SystemApi(client);
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
