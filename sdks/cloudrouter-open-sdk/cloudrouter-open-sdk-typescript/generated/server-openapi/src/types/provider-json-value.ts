import type { ProviderJsonNull } from './provider-json-null';
import type { ProviderJsonObject } from './provider-json-object';

/** A JSON value forwarded to or returned by a provider extension point. */
export type ProviderJsonValue = string | number | number | boolean | ProviderJsonNull | unknown[] | ProviderJsonObject;
