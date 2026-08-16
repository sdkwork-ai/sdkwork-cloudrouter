const AUTH_PROJECTION_QUERY_KEYS = new Set([
  'tenantId',
  'tenant_id',
  'userId',
  'user_id',
  'appId',
  'app_id',
  'organizationId',
  'organization_id',
  'operatorId',
  'operator_id',
  'subjectType',
  'subject_type',
  'subjectId',
  'subject_id',
  'sessionId',
  'session_id',
]);

const AUTH_PROJECTION_BODY_KEYS = AUTH_PROJECTION_QUERY_KEYS;

// Canonical `x-sdkwork-*` identity projection headers (API_SPEC §10.2) plus the
// legacy `X-Tenant-Id`/`X-Platform`/`X-User-Id` family emitted by old
// `@sdkwork/sdk-common` builds. Web Framework surface classification rejects
// any of these on the wire with 40001; the dual-token credentials are the only
// identity material a client may send. `x-sdkwork-locale` is the approved
// locale header and is intentionally not in this list.
const AUTH_PROJECTION_HEADER_NAMES = new Set([
  'x-sdkwork-tenant-id',
  'x-sdkwork-organization-id',
  'x-sdkwork-user-id',
  'x-sdkwork-actor-id',
  'x-sdkwork-actor-kind',
  'x-sdkwork-session-id',
  'x-sdkwork-app-id',
  'x-sdkwork-environment',
  'x-sdkwork-deployment-profile',
  'x-sdkwork-deployment-mode',
  'x-sdkwork-runtime-target',
  'x-sdkwork-auth-level',
  'x-sdkwork-data-scope',
  'x-sdkwork-permission-scope',
  'x-sdkwork-device-id',
  'x-sdkwork-context-signature',
  'x-sdkwork-subject-tenant-id',
  'x-sdkwork-subject-organization-id',
  'x-sdkwork-subject-user-id',
  'x-sdkwork-subject-timestamp',
  'x-sdkwork-subject-signature',
  'x-tenant-id',
  'x-organization-id',
  'x-platform',
  'x-user-id',
]);

export function omitAuthProjectionQuery(
  query?: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean | undefined> | undefined {
  if (!query) {
    return undefined;
  }

  const next: Record<string, string | number | boolean | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    if (!AUTH_PROJECTION_QUERY_KEYS.has(key)) {
      next[key] = value;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function omitAuthProjectionBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return body;
  }

  const record = body as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!AUTH_PROJECTION_BODY_KEYS.has(key)) {
      next[key] = value;
    }
  }
  return next;
}

export function omitAuthProjectionHeaders(
  headers?: Record<string, string>,
): Record<string, string> | undefined {
  if (!headers || typeof headers !== 'object') {
    return headers;
  }

  const next: Record<string, string> = {};
  let dropped = false;
  for (const [name, value] of Object.entries(headers)) {
    if (AUTH_PROJECTION_HEADER_NAMES.has(name.toLowerCase())) {
      dropped = true;
      continue;
    }
    next[name] = value;
  }
  return dropped ? next : headers;
}
