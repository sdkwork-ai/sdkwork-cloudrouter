export declare const SAFE_PATH_SEGMENT_PATTERN: RegExp;
export declare function requiredSafePathSegment(value: string, fieldName: string): string;
export declare function optionalBoundedPositiveInteger(value: unknown, fieldName: string, maxValue: number): number | undefined;
export declare function optionalPositiveInt64String(value: unknown, fieldName: string): string | undefined;
export declare function optionalBoundedPositiveInt64String(value: unknown, fieldName: string, maxValue: number): string | undefined;
export declare function positiveInt64String(value: unknown, fieldName: string): string;
export declare function nonNegativeInt64String(value: unknown, fieldName: string): string;
export declare function optionalPositiveInteger(value: unknown, fieldName: string): number | undefined;
export declare function optionalInteger(value: unknown, fieldName: string): number | undefined;
export declare function optionalText(value: unknown, fieldName: string, maxLength: number): string | undefined;
export declare function pruneUndefinedQueryParams<T extends Record<string, unknown>>(value: T): Record<string, string>;
export type StandardListQueryArguments = [
    page?: number,
    pageSize?: number,
    searchQuery?: string,
    status?: string,
    startTime?: string,
    endTime?: string
];
export declare function standardListQueryArguments(params: Record<string, string | number>): StandardListQueryArguments;
//# sourceMappingURL=sdk-request-boundary.d.ts.map