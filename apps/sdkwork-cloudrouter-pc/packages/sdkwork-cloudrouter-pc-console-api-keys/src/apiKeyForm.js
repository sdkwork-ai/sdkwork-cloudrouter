/** 从表单构造调用链输入；未启用（undefined）时返回 undefined。 */
export function chainInputFromForm(values) {
    if (!values.chain) {
        return undefined;
    }
    const maxInflight = values.chain.maxInflight.trim();
    const allowlist = splitIpLines(values.chain.allowlistText);
    const denylist = splitIpLines(values.chain.denylistText);
    if (!maxInflight && allowlist.length === 0 && denylist.length === 0) {
        return undefined;
    }
    return {
        concurrency: maxInflight ? { maxInflight } : undefined,
        ipAccess: {
            mode: 'open',
            allowlist,
            denylist,
        },
    };
}
function splitIpLines(text) {
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}
export const DEFAULT_API_KEY_MODALITIES = ['text', 'image', 'video', 'audio', 'music'];
export const DEFAULT_ACCOUNT_GROUP = 'default-group';
const DEFAULT_API_KEY_QUOTA = '0.000000';
const DEFAULT_IP_LIMIT = 'unrestricted';
const DEFAULT_EXPIRATION = 'never';
const MAX_BATCH_CREATE_COUNT = 100;
export function createApiKeyInputFromForm(values, _index = 0) {
    return {
        name: requiredText(values.name, 'name'),
        accountGroups: normalizeAccountGroups(values.accountGroups),
        groupRoutingPolicies: normalizeGroupRoutingPolicies(values.accountGroups, values.groupRoutingPolicies),
        quota: normalizeQuota(values.quota, values.isUnlimitedQuota),
        isUnlimitedQuota: values.isUnlimitedQuota,
        modalities: normalizeModalities(values.modalities),
        ipLimit: normalizeOptionalText(values.ipLimit, DEFAULT_IP_LIMIT),
        expires: normalizeOptionalText(values.expires, DEFAULT_EXPIRATION),
        chain: chainInputFromForm(values),
    };
}
export function createApiKeyInputsFromForm(values) {
    const count = normalizeCreateCount(values.createCount);
    const baseName = requiredText(values.name, 'name');
    return Array.from({ length: count }, (_, index) => ({
        ...createApiKeyInputFromForm({
            ...values,
            name: count > 1 ? `${baseName} ${index + 1}` : baseName,
        }),
    }));
}
function requiredText(value, fieldName) {
    const text = value.trim();
    if (!text) {
        throw new Error(`${fieldName} is required`);
    }
    return text;
}
function normalizeOptionalText(value, fallback) {
    const text = value?.trim() ?? '';
    return text.length > 0 ? text : fallback;
}
function normalizeAccountGroups(values) {
    const groups = [];
    for (const rawValue of values) {
        const value = rawValue.trim();
        if (!value) {
            continue;
        }
        if (!groups.includes(value)) {
            groups.push(value);
        }
    }
    if (groups.length === 0) {
        groups.push(DEFAULT_ACCOUNT_GROUP);
    }
    return groups;
}
/** 仅保留绑定分组内的策略；缺省策略由服务端按 price_first/weight 100 落库 */
function normalizeGroupRoutingPolicies(accountGroups, policies) {
    if (!Array.isArray(policies) || policies.length === 0) {
        return undefined;
    }
    const bound = new Set(normalizeAccountGroups(accountGroups));
    const normalized = policies
        .map((policy) => ({
        accountGroup: policy.accountGroup.trim(),
        routingStrategy: policy.routingStrategy,
        weight: policy.weight,
    }))
        .filter((policy) => bound.has(policy.accountGroup) && policy.accountGroup.length > 0);
    return normalized.length > 0 ? normalized : undefined;
}
function normalizeQuota(value, isUnlimitedQuota) {
    if (isUnlimitedQuota) {
        return DEFAULT_API_KEY_QUOTA;
    }
    const text = value.trim();
    if (!/^\d+(?:\.\d{1,6})?$/.test(text)) {
        throw new Error('quota must be a non-negative decimal');
    }
    const parsed = Number(text);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error('quota must be a non-negative decimal');
    }
    return text;
}
function normalizeModalities(values) {
    const modalities = [];
    for (const rawValue of values) {
        const value = rawValue.trim().toLowerCase();
        if (!value) {
            continue;
        }
        if (!isApiKeyModality(value)) {
            throw new Error(`Unsupported API key modality: ${value}`);
        }
        modalities.push(value);
    }
    const uniqueModalities = [...new Set(modalities)];
    if (uniqueModalities.length === 0) {
        throw new Error('modalities must include at least one item');
    }
    return uniqueModalities;
}
function normalizeCreateCount(value) {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > MAX_BATCH_CREATE_COUNT) {
        throw new Error(`createCount must be between 1 and ${MAX_BATCH_CREATE_COUNT}`);
    }
    return value;
}
function isApiKeyModality(value) {
    return DEFAULT_API_KEY_MODALITIES.includes(value);
}
//# sourceMappingURL=apiKeyForm.js.map