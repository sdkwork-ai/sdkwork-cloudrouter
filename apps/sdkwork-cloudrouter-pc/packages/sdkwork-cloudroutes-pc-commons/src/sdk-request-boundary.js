import { isBlank, trim } from "./sdkwork-utils.js";
export const SAFE_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9._~-]{1,128}$/u;
export function requiredSafePathSegment(value, fieldName) {
    if (!value) {
        throw new Error(`${fieldName} is required`);
    }
    if (!SAFE_PATH_SEGMENT_PATTERN.test(value)) {
        throw new Error(`${fieldName} must be a safe path segment`);
    }
    return value;
}
export function optionalBoundedPositiveInteger(value, fieldName, maxValue) {
    let numberValue;
    try {
        numberValue = optionalInteger(value, fieldName);
    }
    catch {
        throw new Error(`${fieldName} must be between 1 and ${maxValue}`);
    }
    if (numberValue === undefined) {
        return undefined;
    }
    if (numberValue < 1 || numberValue > maxValue) {
        throw new Error(`${fieldName} must be between 1 and ${maxValue}`);
    }
    return numberValue;
}
export function optionalPositiveInt64String(value, fieldName) {
    const normalized = optionalIntegerString(value, fieldName);
    if (normalized === undefined) {
        return undefined;
    }
    if (!/^[1-9]\d*$/u.test(normalized)) {
        throw new Error(`${fieldName} must be a positive integer`);
    }
    return normalized;
}
export function optionalBoundedPositiveInt64String(value, fieldName, maxValue) {
    const numberValue = optionalBoundedPositiveInteger(value, fieldName, maxValue);
    return numberValue === undefined ? undefined : String(numberValue);
}
export function positiveInt64String(value, fieldName) {
    const normalized = optionalPositiveInt64String(value, fieldName);
    if (normalized === undefined) {
        throw new Error(`${fieldName} must be a positive integer`);
    }
    return normalized;
}
export function nonNegativeInt64String(value, fieldName) {
    const normalized = optionalIntegerString(value, fieldName);
    if (normalized === undefined || !/^(0|[1-9]\d*)$/u.test(normalized)) {
        throw new Error(`${fieldName} must be a non-negative integer`);
    }
    return normalized;
}
export function optionalPositiveInteger(value, fieldName) {
    let numberValue;
    try {
        numberValue = optionalInteger(value, fieldName);
    }
    catch {
        throw new Error(`${fieldName} must be a positive integer`);
    }
    if (numberValue === undefined) {
        return undefined;
    }
    if (numberValue < 1) {
        throw new Error(`${fieldName} must be a positive integer`);
    }
    return numberValue;
}
export function optionalInteger(value, fieldName) {
    const textValue = optionalIntegerString(value, fieldName);
    if (textValue === undefined) {
        return undefined;
    }
    const numberValue = Number(textValue);
    if (!Number.isSafeInteger(numberValue)) {
        throw new Error(`${fieldName} must be an integer`);
    }
    return numberValue;
}
function optionalIntegerString(value, fieldName) {
    if (value === undefined || value === null) {
        return undefined;
    }
    const normalized = typeof value === 'string' ? trim(value) : value;
    if (normalized === '') {
        return undefined;
    }
    if (typeof normalized !== 'number' && typeof normalized !== 'string') {
        throw new Error(`${fieldName} must be an integer`);
    }
    const textValue = typeof normalized === 'string' ? normalized : String(normalized);
    if (!/^-?\d+$/u.test(textValue)) {
        throw new Error(`${fieldName} must be an integer`);
    }
    return textValue;
}
export function optionalText(value, fieldName, maxLength) {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} must be a string`);
    }
    const normalized = trim(value);
    if (isBlank(normalized)) {
        return undefined;
    }
    if (normalized.length > maxLength) {
        throw new Error(`${fieldName} must be at most ${maxLength} characters`);
    }
    return normalized;
}
export function pruneUndefinedQueryParams(value) {
    return Object.fromEntries(Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, String(item)]));
}
export function standardListQueryArguments(params) {
    return [
        optionalQueryNumber(params.page),
        optionalQueryNumber(params.pageSize),
        optionalQueryString(params.searchQuery),
        optionalQueryString(params.status),
        optionalQueryString(params.startTime),
        optionalQueryString(params.endTime),
    ];
}
function optionalQueryNumber(value) {
    return typeof value === 'number' ? value : undefined;
}
function optionalQueryString(value) {
    return typeof value === 'string' ? value : undefined;
}
//# sourceMappingURL=sdk-request-boundary.js.map