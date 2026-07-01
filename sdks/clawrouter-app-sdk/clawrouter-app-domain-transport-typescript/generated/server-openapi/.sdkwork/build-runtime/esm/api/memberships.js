import { appApiPath } from './paths';
export class MembershipsPurchasesApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/memberships/purchases`));
    }
    /** Renew */
    async renew() {
        return this.client.post(appApiPath(`/memberships/purchases/renew`));
    }
    /** Upgrade */
    async upgrade() {
        return this.client.post(appApiPath(`/memberships/purchases/upgrade`));
    }
}
export class MembershipsPrivilegesUsageApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/memberships/privileges/usage`));
    }
}
export class MembershipsPrivilegesSpeedUpsApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/memberships/privileges/speed_ups`));
    }
}
export class MembershipsPrivilegesApi {
    constructor(client) {
        this.client = client;
        this.speedUps = new MembershipsPrivilegesSpeedUpsApi(client);
        this.usage = new MembershipsPrivilegesUsageApi(client);
    }
}
export class MembershipsPointsHistoryApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/memberships/points/history`));
    }
}
export class MembershipsPointsDailyRewardsStatusApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/memberships/points/daily_rewards/status`));
    }
}
export class MembershipsPointsDailyRewardsApi {
    constructor(client) {
        this.client = client;
        this.status = new MembershipsPointsDailyRewardsStatusApi(client);
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/memberships/points/daily_rewards`));
    }
}
export class MembershipsPointsBalanceApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/memberships/points/balance`));
    }
}
export class MembershipsPointsApi {
    constructor(client) {
        this.client = client;
        this.balance = new MembershipsPointsBalanceApi(client);
        this.dailyRewards = new MembershipsPointsDailyRewardsApi(client);
        this.history = new MembershipsPointsHistoryApi(client);
    }
}
export class MembershipsPlansApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/memberships/plans`));
    }
}
export class MembershipsPackagesApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/memberships/packages`));
    }
    /** Retrieve */
    async retrieve(packageId) {
        return this.client.get(appApiPath(`/memberships/packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}`));
    }
}
export class MembershipsPackageGroupsPackagesApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list(packageGroupId) {
        return this.client.get(appApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}/packages`));
    }
}
export class MembershipsPackageGroupsApi {
    constructor(client) {
        this.client = client;
        this.packages = new MembershipsPackageGroupsPackagesApi(client);
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/memberships/package_groups`));
    }
    /** Retrieve */
    async retrieve(packageGroupId) {
        return this.client.get(appApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}`));
    }
}
export class MembershipsCurrentStatusApi {
    constructor(client) {
        this.client = client;
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/memberships/current/status`));
    }
}
export class MembershipsCurrentApi {
    constructor(client) {
        this.client = client;
        this.status = new MembershipsCurrentStatusApi(client);
    }
    /** Retrieve */
    async retrieve() {
        return this.client.get(appApiPath(`/memberships/current`));
    }
}
export class MembershipsBenefitsApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/memberships/benefits`));
    }
}
export class MembershipsApi {
    constructor(client) {
        this.client = client;
        this.benefits = new MembershipsBenefitsApi(client);
        this.current = new MembershipsCurrentApi(client);
        this.packageGroups = new MembershipsPackageGroupsApi(client);
        this.packages = new MembershipsPackagesApi(client);
        this.plans = new MembershipsPlansApi(client);
        this.points = new MembershipsPointsApi(client);
        this.privileges = new MembershipsPrivilegesApi(client);
        this.purchases = new MembershipsPurchasesApi(client);
    }
}
export function createMembershipsApi(client) {
    return new MembershipsApi(client);
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
