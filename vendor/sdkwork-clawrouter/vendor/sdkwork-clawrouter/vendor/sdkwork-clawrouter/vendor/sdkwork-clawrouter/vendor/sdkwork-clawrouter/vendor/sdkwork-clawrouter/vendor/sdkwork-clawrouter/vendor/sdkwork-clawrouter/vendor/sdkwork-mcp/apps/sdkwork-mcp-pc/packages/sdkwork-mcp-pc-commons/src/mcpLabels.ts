const TRANSPORT_LABELS: Record<string, string> = {
  stdio: 'Stdio',
  sse: 'SSE',
  http: 'HTTP',
  streamable_http: 'Streamable HTTP',
};

const HEALTH_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  healthy: 'Healthy',
  degraded: 'Degraded',
  unhealthy: 'Unhealthy',
};

const LIFECYCLE_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  deprecated: 'Deprecated',
  archived: 'Archived',
};

const VISIBILITY_LABELS: Record<string, string> = {
  private: 'Private',
  tenant: 'Tenant',
  organization: 'Organization',
  public: 'Public',
};

const PUBLISH_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  deprecated: 'Deprecated',
};

export function formatMcpTransport(value: string): string {
  return TRANSPORT_LABELS[value] ?? value;
}

export function formatMcpHealth(value: string): string {
  return HEALTH_LABELS[value] ?? value;
}

export function formatMcpLifecycle(value: string): string {
  return LIFECYCLE_LABELS[value] ?? value;
}

export function formatMcpVisibility(value: string): string {
  return VISIBILITY_LABELS[value] ?? value;
}

export function formatMcpPublishStatus(value: string): string {
  return PUBLISH_LABELS[value] ?? value;
}

export function healthTone(value: string): 'neutral' | 'success' | 'warning' | 'danger' {
  switch (value) {
    case 'healthy':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'unhealthy':
      return 'danger';
    default:
      return 'neutral';
  }
}
