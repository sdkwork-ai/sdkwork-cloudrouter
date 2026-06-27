import { getStoredAppSessionAccessToken, resolveStoredPortalTenantId } from './app-session-token.ts';

function normalizeBearerToken(value?: string): string {
  const normalized = (value ?? '').trim();
  if (!normalized) {
    return '';
  }

  return normalized.replace(/^Bearer\s+/i, '').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseJwtPayload(token: string): Record<string, unknown> | undefined {
  const normalizedToken = normalizeBearerToken(token);
  const parts = normalizedToken.split('.');
  if (parts.length < 2) {
    return undefined;
  }

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4 || 4)) % 4),
      '=',
    );
    const json = atob(padded);
    const parsed = JSON.parse(json) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function readJwtClaimString(
  claims: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = String(claims[key] ?? '').trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function resolveSessionAccessTokenClaim(
  ...keys: string[]
): string | undefined {
  const accessToken = getStoredAppSessionAccessToken();
  if (!accessToken) {
    return undefined;
  }

  const claims = parseJwtPayload(accessToken);
  if (!claims) {
    return undefined;
  }

  return readJwtClaimString(claims, ...keys);
}

export function resolveSessionTenantId(): string {
  const tenantId = resolveStoredPortalTenantId();
  if (!tenantId) {
    throw new Error(
      'Authenticated IAM access token with tenant_id claim is required. Log in through the SaaS dual-token flow instead of configuring tenant env variables.',
    );
  }

  return tenantId;
}
