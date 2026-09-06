import { isBlank, trim } from "./sdkwork-utils.js";
export function ensureSdkworkApiSuccess(result, message) {
    if (Array.isArray(result)) {
        if (result.length === 0) {
            throw new Error(message);
        }
        return;
    }
    if (!isRecord(result)) {
        throw new Error(message);
    }
    const record = result;
    const code = isApiEnvelope(record) ? readString(record, 'code') : '';
    if (code && !isSuccessCode(record.code)) {
        throw new Error(readString(record, 'detail') || readString(record, 'msg') || readString(record, 'message') || `${message}: ${code}`);
    }
    const knownCode = code || (isKnownApiCode(record.code) ? readString(record, 'code') : '');
    if (knownCode && !isSuccessCode(record.code)) {
        throw new Error(readString(record, 'detail') || readString(record, 'msg') || readString(record, 'message') || `${message}: ${knownCode}`);
    }
    if (code) {
        return;
    }
    if (Object.keys(record).length === 0) {
        throw new Error(message);
    }
}
export function readApiData(result) {
    if (Array.isArray(result)) {
        return result;
    }
    if (!isRecord(result)) {
        return undefined;
    }
    return isApiEnvelope(result) ? result.data : result;
}
export function readApiRecord(result) {
    const data = readApiData(result);
    return isRecord(data) ? data : {};
}
export function readApiItems(result, keys = ['items', 'records', 'list', 'data']) {
    const data = readApiData(result);
    if (Array.isArray(data)) {
        return data;
    }
    if (!isRecord(data)) {
        return [];
    }
    for (const key of keys) {
        const value = data[key];
        if (Array.isArray(value)) {
            return value;
        }
    }
    return [];
}
export function readRequiredApiItems(result, message, keys = ['items', 'records', 'list', 'data']) {
    const data = readApiData(result);
    if (Array.isArray(data)) {
        return data;
    }
    if (!isRecord(data)) {
        throw new Error(message);
    }
    for (const key of keys) {
        const value = data[key];
        if (Array.isArray(value)) {
            return value;
        }
    }
    throw new Error(message);
}
export function readApiItem(result, keys = ['item', 'record']) {
    const data = readApiData(result);
    if (!isRecord(data)) {
        return null;
    }
    for (const key of keys) {
        const value = data[key];
        if (isRecord(value)) {
            return value;
        }
    }
    return data;
}
export function readRequiredApiItem(result, message, keys = ['item', 'record']) {
    const data = readApiData(result);
    if (!isRecord(data)) {
        throw new Error(message);
    }
    for (const key of keys) {
        const value = data[key];
        if (isRecord(value)) {
            return value;
        }
    }
    if (keys.length !== 2 || keys[0] !== 'item' || keys[1] !== 'record') {
        throw new Error(message);
    }
    if (keys.some((key) => key in data) || isNonEntityResultRecord(data)) {
        throw new Error(message);
    }
    return data;
}
export function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isNonEntityResultRecord(record) {
    const keys = Object.keys(record);
    if (keys.length === 0) {
        return true;
    }
    if (['items', 'records', 'list'].some((key) => Array.isArray(record[key]))) {
        return true;
    }
    return keys.every((key) => ['ok', 'success', 'created', 'updated', 'deleted'].includes(key));
}
function isApiEnvelope(record) {
    return isKnownApiCode(record.code) && ('data' in record || 'detail' in record || 'msg' in record);
}
function isKnownApiCode(value) {
    return isSuccessCode(value)
        || (typeof value === 'number' && Number.isInteger(value) && value >= 1000 && value <= 59999)
        || (typeof value === 'string' && /^[1-5]\d{3,4}$/u.test(value));
}
function isSuccessCode(value) {
    return value === 0
        || value === 200
        || value === 2000
        || value === '0'
        || value === '200'
        || value === '2000';
}
export function readString(record, key, fallback = '') {
    const value = record[key];
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return fallback;
}
export function readRequiredString(record, key, message) {
    const value = trim(readString(record, key));
    if (isBlank(value)) {
        throw new Error(message);
    }
    return value;
}
export function requiredPositiveInt64String(value, fieldName) {
    const normalized = trim(value);
    if (!/^[1-9][0-9]*$/u.test(normalized)) {
        throw new Error(`${fieldName} must be a positive int64 string`);
    }
    return normalized;
}
export function readRequiredPositiveInt64String(record, key, message) {
    const rawValue = record[key];
    if (typeof rawValue !== 'string') {
        throw new Error(message);
    }
    const value = trim(rawValue);
    if (!/^[1-9][0-9]*$/u.test(value)) {
        throw new Error(message);
    }
    return value;
}
export function readRequiredNonNegativeInt64String(record, key, message) {
    const rawValue = record[key];
    if (typeof rawValue !== 'string') {
        throw new Error(message);
    }
    const value = trim(rawValue);
    if (!/^(0|[1-9][0-9]*)$/u.test(value)) {
        throw new Error(message);
    }
    return value;
}
export function readNullableString(record, key) {
    const value = record[key];
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return null;
}
export function readNumber(record, key, fallback = 0) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return fallback;
}
export function readRequiredNumber(record, key, message) {
    const value = readNumber(record, key, Number.NaN);
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(message);
    }
    return value;
}
export function readRequiredNonNegativeNumber(record, key, message) {
    const value = readNumber(record, key, Number.NaN);
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(message);
    }
    return value;
}
export function readBoolean(record, key, fallback = false) {
    const value = record[key];
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') {
            return true;
        }
        if (value.toLowerCase() === 'false') {
            return false;
        }
    }
    return fallback;
}
export function readStringArray(record, key, fallback = []) {
    const value = record[key];
    if (!Array.isArray(value)) {
        return [...fallback];
    }
    const items = value
        .map((item) => {
        if (typeof item === 'string') {
            return item;
        }
        if (typeof item === 'number' || typeof item === 'boolean') {
            return String(item);
        }
        return null;
    })
        .filter((item) => item !== null);
    return items.length > 0 ? items : [...fallback];
}
export function readRecordArray(record, key) {
    const value = record[key];
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(isRecord);
}
//# sourceMappingURL=api-result.js.map