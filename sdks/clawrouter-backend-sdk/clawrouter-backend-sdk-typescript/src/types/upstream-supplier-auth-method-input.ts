import type { JsonValue } from './json-value';

/** Upstream supplier auth method input schema exposed by Claw Router. */
export interface UpstreamSupplierAuthMethodInput {
  /** Auth method code field on upstream supplier auth method input. */
  authMethodCode: string;
  /** Auth method name field on upstream supplier auth method input. */
  authMethodName: string;
  /** Auth type field on upstream supplier auth method input. */
  authType: 'api_key' | 'bearer_token' | 'oauth2_client_credentials' | 'oauth2_authorization_code' | 'aws_sigv4' | 'custom';
  /** Authorization url field on upstream supplier auth method input. */
  authorizationUrl?: string | null;
  /** Config schema field on upstream supplier auth method input. */
  configSchema: Record<string, JsonValue>;
  /** Priority field on upstream supplier auth method input. */
  priority?: number | null;
  /** Runtime auth config field on upstream supplier auth method input. */
  runtimeAuthConfig: { adapterOptions?: Record<string, JsonValue> | null; adapterScheme?: string | null; credentialParameter?: string | null; credentialTransport: 'bearer' | 'header' | 'query' | 'provider_adapter'; defaultHeaders?: Record<string, string>; };
  /** Scopes field on upstream supplier auth method input. */
  scopes?: string[] | null;
  /** Status field on upstream supplier auth method input. */
  status?: number | null;
  /** Token url field on upstream supplier auth method input. */
  tokenUrl?: string | null;
}
