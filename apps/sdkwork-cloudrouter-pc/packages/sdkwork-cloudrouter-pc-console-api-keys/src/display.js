import { resolveAccountGroupName } from './accountGroups';
const API_KEY_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;
const API_KEY_DATE_TIME_OPTIONS = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
};
function parseTimestampComponents(value) {
    const match = API_KEY_TIMESTAMP_PATTERN.exec(value.trim());
    if (!match) {
        return null;
    }
    return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6])];
}
function formatDateTime(date, language) {
    try {
        return new Intl.DateTimeFormat(language, API_KEY_DATE_TIME_OPTIONS).format(date);
    }
    catch {
        return null;
    }
}
/** `created` is a UTC timestamp from the backend; convert it to local time and format for the current locale. */
export function formatApiKeyCreated(value, language) {
    const components = parseTimestampComponents(value);
    if (!components) {
        return value;
    }
    const [year, month, day, hour, minute, second] = components;
    const formatted = formatDateTime(new Date(Date.UTC(year, month - 1, day, hour, minute, second)), language);
    return formatted ?? value;
}
/** `expires` is the wall-clock time the user submitted (no timezone); keep the wall clock and format for the current locale. */
export function formatApiKeyExpiration(value, t, language) {
    if (value === 'never') {
        return t('console.apiKeys.neverExpires', 'Never expires');
    }
    const components = parseTimestampComponents(value);
    if (!components) {
        return value;
    }
    const [year, month, day, hour, minute, second] = components;
    const formatted = formatDateTime(new Date(year, month - 1, day, hour, minute, second), language);
    return formatted ?? value;
}
export function formatApiKeyQuota(value, t, language) {
    if (value === 'unlimited') {
        return t('console.apiKeys.unlimited', 'Unlimited');
    }
    return formatApiKeyNumber(value, language);
}
export function formatApiKeyNumber(value, language) {
    const normalized = value.trim();
    if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
        return value;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
        return value;
    }
    try {
        return parsed.toLocaleString(language, { maximumFractionDigits: 6 });
    }
    catch {
        return value;
    }
}
export function formatApiKeyIpLimit(value, t) {
    return value === 'unrestricted' ? t('console.apiKeys.unrestricted', 'Unrestricted') : value;
}
export function displayApiKeyGroupName(key, groups, t) {
    const code = key.accountGroup.trim();
    const name = key.accountGroupName?.trim() || resolveAccountGroupName(key.accountGroup, groups);
    if (code === 'unassigned' || name === 'unassigned' || name === 'Unassigned') {
        return t('console.apiKeys.groupUnassigned', 'Unassigned');
    }
    return name;
}
//# sourceMappingURL=display.js.map