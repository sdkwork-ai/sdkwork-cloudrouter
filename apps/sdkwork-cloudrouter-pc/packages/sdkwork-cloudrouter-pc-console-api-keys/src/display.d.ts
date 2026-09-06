import type { useTranslation } from 'react-i18next';
import type { AccountGroup, ApiKey } from './apiKeyService';
export type TranslateFunction = ReturnType<typeof useTranslation>['t'];
/** `created` is a UTC timestamp from the backend; convert it to local time and format for the current locale. */
export declare function formatApiKeyCreated(value: string, language: string): string;
/** `expires` is the wall-clock time the user submitted (no timezone); keep the wall clock and format for the current locale. */
export declare function formatApiKeyExpiration(value: string, t: TranslateFunction, language: string): string;
export declare function formatApiKeyQuota(value: string, t: TranslateFunction, language: string): string;
export declare function formatApiKeyNumber(value: string, language: string): string;
export declare function formatApiKeyIpLimit(value: string, t: TranslateFunction): string;
export declare function displayApiKeyGroupName(key: ApiKey, groups: AccountGroup[], t: TranslateFunction): string;
//# sourceMappingURL=display.d.ts.map