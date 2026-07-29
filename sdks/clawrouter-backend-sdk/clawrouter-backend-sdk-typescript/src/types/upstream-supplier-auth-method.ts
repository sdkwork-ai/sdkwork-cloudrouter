import type { JsonValue } from './json-value';

/** Upstream supplier auth method schema exposed by Claw Router. */
export interface UpstreamSupplierAuthMethod {
  /** Auth method code field on upstream supplier auth method. */
  authMethodCode: string;
  /** Auth method name field on upstream supplier auth method. */
  authMethodName: string;
  /** Auth type field on upstream supplier auth method. */
  authType: 'api_key' | 'bearer_token' | 'custom';
  /** Config schema field on upstream supplier auth method. */
  configSchema: Record<string, JsonValue>;
  /** Id field on upstream supplier auth method. */
  id: string;
  /** Priority field on upstream supplier auth method. */
  priority: number;
  /** Runtime auth config field on upstream supplier auth method. */
  runtimeAuthConfig: { credentialParameter?: string | null; credentialTransport: 'bearer' | 'header' | 'query'; defaultHeaders?: Record<string, string>; };
  /** Status field on upstream supplier auth method. */
  status: number;
}
