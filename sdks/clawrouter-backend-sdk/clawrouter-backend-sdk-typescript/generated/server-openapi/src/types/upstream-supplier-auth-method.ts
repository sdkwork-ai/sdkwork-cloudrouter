import type { JsonValue } from './json-value';

/** Upstream supplier auth method schema exposed by Claw Router. */
export interface UpstreamSupplierAuthMethod {
  /** Auth method code field on upstream supplier auth method. */
  authMethodCode: string;
  /** Auth method name field on upstream supplier auth method. */
  authMethodName: string;
  /** Auth type field on upstream supplier auth method. */
  authType: 'api_key' | 'bearer_token' | 'oauth2_client_credentials' | 'oauth2_authorization_code' | 'aws_sigv4' | 'custom';
  /** Authorization url field on upstream supplier auth method. */
  authorizationUrl: string | null;
  /** Config schema field on upstream supplier auth method. */
  configSchema: Record<string, JsonValue>;
  /** Id field on upstream supplier auth method. */
  id: string;
  /** Priority field on upstream supplier auth method. */
  priority: number;
  /** Runtime auth config field on upstream supplier auth method. */
  runtimeAuthConfig: { adapterOptions?: Record<string, JsonValue> | null; adapterScheme?: string | null; credentialParameter?: string | null; credentialTransport: 'bearer' | 'header' | 'query' | 'provider_adapter'; defaultHeaders?: Record<string, string>; };
  /** Scopes field on upstream supplier auth method. */
  scopes: string[] | null;
  /** Status field on upstream supplier auth method. */
  status: number;
  /** Token url field on upstream supplier auth method. */
  tokenUrl: string | null;
}
