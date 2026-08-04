import { isBlank, trim } from './sdkwork-utils.ts';

export function formatUserAgentDeviceLabel(userAgent: string): string {
  const value = trim(userAgent);
  if (isBlank(value)) {
    return 'Unknown';
  }

  const lower = value.toLowerCase();
  const os = detectUserAgentOs(lower);
  const client = detectUserAgentClient(lower);
  return `${os} / ${client}`;
}

function detectUserAgentOs(value: string): string {
  if (
    value.includes('curl/')
    || value.includes('httpie/')
    || value.includes('python-requests')
    || value.includes('okhttp')
    || value.includes('go-http-client')
  ) {
    return 'CLI';
  }
  if (value.includes('iphone')) {
    return 'iPhone';
  }
  if (value.includes('ipad')) {
    return 'iPad';
  }
  if (value.includes('android')) {
    return 'Android';
  }
  if (value.includes('windows')) {
    return 'Windows';
  }
  if (value.includes('mac os x') || value.includes('macintosh')) {
    return 'macOS';
  }
  if (value.includes('linux')) {
    return 'Linux';
  }
  return 'Device';
}

function detectUserAgentClient(value: string): string {
  if (value.includes('edg/')) {
    return 'Edge';
  }
  if (value.includes('firefox/')) {
    return 'Firefox';
  }
  if (value.includes('chrome/') && !value.includes('chromium/') && !value.includes('edg/')) {
    return 'Chrome';
  }
  if (value.includes('chromium/')) {
    return 'Chromium';
  }
  if (value.includes('safari/') && !value.includes('chrome/') && !value.includes('chromium/')) {
    return 'Safari';
  }
  if (value.includes('curl/')) {
    return 'curl';
  }
  if (value.includes('python-requests')) {
    return 'Python';
  }
  if (value.includes('okhttp')) {
    return 'OkHttp';
  }
  if (value.includes('httpie/')) {
    return 'HTTPie';
  }
  if (value.includes('go-http-client')) {
    return 'Go HTTP';
  }
  return 'Client';
}
