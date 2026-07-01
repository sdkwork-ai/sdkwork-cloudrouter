import { appApiPath } from './paths';
export class PromotionsUserCouponsWalletApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/promotions/user_coupons/wallet`));
    }
    /** Retrieve */
    async retrieve(userCouponId) {
        return this.client.get(appApiPath(`/promotions/user_coupons/wallet/${serializePathParameter(userCouponId, { name: 'userCouponId', style: 'simple', explode: false })}`));
    }
}
export class PromotionsUserCouponsClaimsApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/promotions/user_coupon_claims`));
    }
}
export class PromotionsUserCouponsApi {
    constructor(client) {
        this.client = client;
        this.claims = new PromotionsUserCouponsClaimsApi(client);
        this.wallet = new PromotionsUserCouponsWalletApi(client);
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/promotions/user_coupons`));
    }
    /** Retrieve */
    async retrieve(userCouponId) {
        return this.client.get(appApiPath(`/promotions/user_coupons/${serializePathParameter(userCouponId, { name: 'userCouponId', style: 'simple', explode: false })}`));
    }
}
export class PromotionsOffersApi {
    constructor(client) {
        this.client = client;
    }
    /** List */
    async list() {
        return this.client.get(appApiPath(`/promotions/offers`));
    }
    /** Retrieve */
    async retrieve(offerId) {
        return this.client.get(appApiPath(`/promotions/offers/${serializePathParameter(offerId, { name: 'offerId', style: 'simple', explode: false })}`));
    }
}
export class PromotionsDiscountApplicationsReversalsApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/promotions/discount_applications/reversals`));
    }
}
export class PromotionsDiscountApplicationsApi {
    constructor(client) {
        this.client = client;
        this.reversals = new PromotionsDiscountApplicationsReversalsApi(client);
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/promotions/discount_applications`));
    }
    /** Release */
    async release(applicationId) {
        return this.client.post(appApiPath(`/promotions/discount_applications/${serializePathParameter(applicationId, { name: 'applicationId', style: 'simple', explode: false })}/releases`));
    }
    /** Rollback */
    async rollback(applicationId) {
        return this.client.post(appApiPath(`/promotions/discount_applications/${serializePathParameter(applicationId, { name: 'applicationId', style: 'simple', explode: false })}/rollback`));
    }
    /** Settle */
    async settle(applicationId) {
        return this.client.post(appApiPath(`/promotions/discount_applications/${serializePathParameter(applicationId, { name: 'applicationId', style: 'simple', explode: false })}/settlements`));
    }
}
export class PromotionsCodesRedemptionsApi {
    constructor(client) {
        this.client = client;
    }
    /** Create */
    async create() {
        return this.client.post(appApiPath(`/promotions/codes/redemptions`));
    }
}
export class PromotionsCodesApi {
    constructor(client) {
        this.client = client;
        this.redemptions = new PromotionsCodesRedemptionsApi(client);
    }
}
export class PromotionsApi {
    constructor(client) {
        this.client = client;
        this.codes = new PromotionsCodesApi(client);
        this.discountApplications = new PromotionsDiscountApplicationsApi(client);
        this.offers = new PromotionsOffersApi(client);
        this.userCoupons = new PromotionsUserCouponsApi(client);
    }
}
export function createPromotionsApi(client) {
    return new PromotionsApi(client);
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
