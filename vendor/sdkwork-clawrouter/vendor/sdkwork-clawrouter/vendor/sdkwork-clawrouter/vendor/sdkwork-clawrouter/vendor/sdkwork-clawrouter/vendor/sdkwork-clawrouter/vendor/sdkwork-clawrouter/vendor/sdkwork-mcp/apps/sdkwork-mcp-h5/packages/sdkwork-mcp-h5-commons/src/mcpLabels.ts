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

const VISIBILITY_LABELS: Record<string, string> = {
  private: 'Private',
  tenant: 'Tenant',
  organization: 'Organization',
  public: 'Public',
};

export function formatMcpTransport(value: string): string {
  return TRANSPORT_LABELS[value] ?? value;
}

export function formatMcpHealth(value: string): string {
  return HEALTH_LABELS[value] ?? value;
}

export function formatMcpVisibility(value: string): string {
  return VISIBILITY_LABELS[value] ?? value;
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

export function healthToneBadgeClass(tone: ReturnType<typeof healthTone>): string {
  switch (tone) {
    case 'success':
      return 'bg-emerald-500/20 text-emerald-300';
    case 'warning':
      return 'bg-amber-500/20 text-amber-300';
    case 'danger':
      return 'bg-red-500/20 text-red-300';
    default:
      return 'bg-white/10 text-gray-300';
  }
}
