import type { JsonValue } from './json-value';

/** Upstream supplier auth method input schema exposed by Claw Router. */
export interface UpstreamSupplierAuthMethodInput {
  /** Auth method code field on upstream supplier auth method input. */
  authMethodCode: string;
  /** Auth method name field on upstream supplier auth method input. */
  authMethodName: string;
  /** Auth type field on upstream supplier auth method input. */
  authType: 'api_key' | 'bearer_token' | 'custom';
  /** Config schema field on upstream supplier auth method input. */
  configSchema: Record<string, JsonValue>;
  /** Priority field on upstream supplier auth method input. */
  priority?: number | null;
  /** Runtime auth config field on upstream supplier auth method input. */
  runtimeAuthConfig: { credentialParameter?: string | null; credentialTransport: 'bearer' | 'header' | 'query'; defaultHeaders?: Record<string, string>; };
  /** Status field on upstream supplier auth method input. */
  status?: number | null;
}
