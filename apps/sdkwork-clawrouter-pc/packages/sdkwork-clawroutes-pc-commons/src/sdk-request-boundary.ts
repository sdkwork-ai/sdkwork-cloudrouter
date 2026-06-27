import { isBlank, trim } from './sdkwork-utils.ts';

export const SAFE_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9._~-]{1,128}$/u;

export function requiredSafePathSegment(value: string, fieldName: string): string {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
  if (!SAFE_PATH_SEGMENT_PATTERN.test(value)) {
    throw new Error(`${fieldName} must be a safe path segment`);
  }
  return value;
}

export function optionalBoundedPositiveInteger(value: unknown, fieldName: string, maxValue: number): number | undefined {
  let numberValue: number | undefined;
  try {
    numberValue = optionalInteger(value, fieldName);
  } catch {
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

export function optionalPositiveInt64String(value: unknown, fieldName: string): string | undefined {
  const normalized = optionalIntegerString(value, fieldName);
  if (normalized === undefined) {
    return undefined;
  }
  if (!/^[1-9]\d*$/u.test(normalized)) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return normalized;
}

export function optionalBoundedPositiveInt64String(value: unknown, fieldName: string, maxValue: number): string | undefined {
  const numberValue = optionalBoundedPositiveInteger(value, fieldName, maxValue);
  return numberValue === undefined ? undefined : String(numberValue);
}

export function positiveInt64String(value: unknown, fieldName: string): string {
  const normalized = optionalPositiveInt64String(value, fieldName);
  if (normalized === undefined) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return normalized;
}

export function nonNegativeInt64String(value: unknown, fieldName: string): string {
  const normalized = optionalIntegerString(value, fieldName);
  if (normalized === undefined || !/^(0|[1-9]\d*)$/u.test(normalized)) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return normalized;
}

export function optionalPositiveInteger(value: unknown, fieldName: string): number | undefined {
  let numberValue: number | undefined;
  try {
    numberValue = optionalInteger(value, fieldName);
  } catch {
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

export function optionalInteger(value: unknown, fieldName: string): number | undefined {
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

function optionalIntegerString(value: unknown, fieldName: string): string | undefined {
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

export function optionalText(value: unknown, fieldName: string, maxLength: number): string | undefined {
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

export function pruneUndefinedQueryParams<T extends Record<string, unknown>>(value: T): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, String(item)]),
  ) as Record<string, string>;
}

export type StandardListQueryArguments = [
  page?: number,
  pageSize?: number,
  searchQuery?: string,
  status?: string,
  startTime?: string,
  endTime?: string,
];

export function standardListQueryArguments(
  params: Record<string, string | number>,
): StandardListQueryArguments {
  return [
    optionalQueryNumber(params.page),
    optionalQueryNumber(params.pageSize),
    optionalQueryString(params.searchQuery),
    optionalQueryString(params.status),
    optionalQueryString(params.startTime),
    optionalQueryString(params.endTime),
  ];
}

function optionalQueryNumber(value: string | number | undefined): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function optionalQueryString(value: string | number | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
