import { OPEN_API_BASE_URL } from '@sdkwork/clawroutes-pc-commons/utils/env';

export type ApiKeyUsageToolId =
  | 'codex'
  | 'claude-code'
  | 'gemini'
  | 'opencode'
  | 'openclaw'
  | 'hermes-agent';

export type GatewayEndpointKind = 'openai' | 'anthropic' | 'gemini';

export interface ApiKeyUsageToolProfile {
  id: ApiKeyUsageToolId;
  labelKey: string;
  fallbackLabel: string;
  summaryKey: string;
  fallbackSummary: string;
  endpointKind: GatewayEndpointKind;
  configPathKey: string;
  fallbackConfigPath: string;
  referenceKey: string;
  fallbackReference: string;
}

export type ApiKeyUsageSnippetMap = Record<ApiKeyUsageToolId, string>;

export interface ApiKeyUsageSnippetInput {
  apiKeyPlaceholder: string;
  openAiBaseUrl: string;
  anthropicBaseUrl: string;
  geminiBaseUrl: string;
}

export const API_KEY_USAGE_TOOL_PROFILES: ApiKeyUsageToolProfile[] = [
  {
    id: 'codex',
    labelKey: 'console.apiKeys.usageDetails.tools.codex',
    fallbackLabel: 'Codex',
    summaryKey: 'console.apiKeys.usageDetails.tools.codexSummary',
    fallbackSummary: 'OpenAI-compatible provider in ~/.codex/config.toml.',
    endpointKind: 'openai',
    configPathKey: 'console.apiKeys.usageDetails.tools.codexPath',
    fallbackConfigPath: '~/.codex/config.toml',
    referenceKey: 'console.apiKeys.usageDetails.tools.codexReference',
    fallbackReference: 'Codex CLI config: model_provider and model_providers entries.',
  },
  {
    id: 'claude-code',
    labelKey: 'console.apiKeys.usageDetails.tools.claudeCode',
    fallbackLabel: 'Claude Code',
    summaryKey: 'console.apiKeys.usageDetails.tools.claudeCodeSummary',
    fallbackSummary: 'Anthropic-compatible endpoint through ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN.',
    endpointKind: 'anthropic',
    configPathKey: 'console.apiKeys.usageDetails.tools.claudeCodePath',
    fallbackConfigPath: 'Shell environment',
    referenceKey: 'console.apiKeys.usageDetails.tools.claudeCodeReference',
    fallbackReference: 'Claude Code environment variables: ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN.',
  },
  {
    id: 'gemini',
    labelKey: 'console.apiKeys.usageDetails.tools.gemini',
    fallbackLabel: 'Gemini',
    summaryKey: 'console.apiKeys.usageDetails.tools.geminiSummary',
    fallbackSummary: 'Google Gemini-compatible endpoint through GOOGLE_GEMINI_BASE_URL and GEMINI_API_KEY.',
    endpointKind: 'gemini',
    configPathKey: 'console.apiKeys.usageDetails.tools.geminiPath',
    fallbackConfigPath: 'Shell environment',
    referenceKey: 'console.apiKeys.usageDetails.tools.geminiReference',
    fallbackReference: 'Gemini CLI configuration: GEMINI_API_KEY and GOOGLE_GEMINI_BASE_URL.',
  },
  {
    id: 'opencode',
    labelKey: 'console.apiKeys.usageDetails.tools.opencode',
    fallbackLabel: 'opencode',
    summaryKey: 'console.apiKeys.usageDetails.tools.opencodeSummary',
    fallbackSummary: 'Custom OpenAI-compatible provider using @ai-sdk/openai-compatible.',
    endpointKind: 'openai',
    configPathKey: 'console.apiKeys.usageDetails.tools.opencodePath',
    fallbackConfigPath: '~/.config/opencode/opencode.json',
    referenceKey: 'console.apiKeys.usageDetails.tools.opencodeReference',
    fallbackReference: 'opencode provider config with npm package @ai-sdk/openai-compatible.',
  },
  {
    id: 'openclaw',
    labelKey: 'console.apiKeys.usageDetails.tools.openclaw',
    fallbackLabel: 'openclaw',
    summaryKey: 'console.apiKeys.usageDetails.tools.openclawSummary',
    fallbackSummary: 'OpenAI-compatible environment variables for OpenClaw CLI compatible mode.',
    endpointKind: 'openai',
    configPathKey: 'console.apiKeys.usageDetails.tools.openclawPath',
    fallbackConfigPath: 'Shell environment',
    referenceKey: 'console.apiKeys.usageDetails.tools.openclawReference',
    fallbackReference: 'OpenClaw CLI compatible OpenAI provider environment.',
  },
  {
    id: 'hermes-agent',
    labelKey: 'console.apiKeys.usageDetails.tools.hermesAgent',
    fallbackLabel: 'Hermes Agent',
    summaryKey: 'console.apiKeys.usageDetails.tools.hermesAgentSummary',
    fallbackSummary: 'OpenAI-compatible environment template for Hermes Agent integrations.',
    endpointKind: 'openai',
    configPathKey: 'console.apiKeys.usageDetails.tools.hermesAgentPath',
    fallbackConfigPath: 'Shell environment',
    referenceKey: 'console.apiKeys.usageDetails.tools.hermesAgentReference',
    fallbackReference: 'Generic OpenAI-compatible provider environment.',
  },
];

export function buildApiKeyUsageToolSnippets(input: ApiKeyUsageSnippetInput): ApiKeyUsageSnippetMap {
  const apiKey = input.apiKeyPlaceholder;
  return {
    codex: [
      `export CLAW_ROUTER_API_KEY="${apiKey}"`,
      '',
      '# ~/.codex/config.toml',
      'model_provider = "clawrouter"',
      'model = "gpt-4o-mini"',
      '',
      '[model_providers.clawrouter]',
      'name = "Claw Router"',
      `base_url = "${input.openAiBaseUrl}"`,
      'env_key = "CLAW_ROUTER_API_KEY"',
      'wire_api = "responses"',
    ].join('\n'),
    'claude-code': [
      `export ANTHROPIC_BASE_URL="${input.anthropicBaseUrl}"`,
      `export ANTHROPIC_AUTH_TOKEN="${apiKey}"`,
      '',
      'claude',
    ].join('\n'),
    gemini: [
      `export GEMINI_API_KEY="${apiKey}"`,
      `export GOOGLE_GEMINI_BASE_URL="${input.geminiBaseUrl}"`,
      '',
      'gemini',
    ].join('\n'),
    opencode: [
      '{',
      '  "$schema": "https://opencode.ai/config.json",',
      '  "provider": {',
      '    "clawrouter": {',
      '      "npm": "@ai-sdk/openai-compatible",',
      '      "name": "Claw Router",',
      '      "options": {',
      `        "baseURL": "${input.openAiBaseUrl}",`,
      '        "apiKey": "{env:CLAW_ROUTER_API_KEY}"',
      '      },',
      '      "models": {',
      '        "gpt-4o-mini": {}',
      '      }',
      '    }',
      '  }',
      '}',
      '',
      `export CLAW_ROUTER_API_KEY="${apiKey}"`,
      'opencode',
    ].join('\n'),
    openclaw: [
      '# ~/.openclaw/config.yaml',
      'providers:',
      '  clawrouter:',
      '    type: openai-compatible',
      `    base_url: ${input.openAiBaseUrl}`,
      '    api_key: ${CLAW_ROUTER_API_KEY}',
      '',
      `export CLAW_ROUTER_API_KEY="${apiKey}"`,
      '',
      'openclaw',
    ].join('\n'),
    'hermes-agent': [
      `export OPENAI_API_KEY="${apiKey}"`,
      `export OPENAI_BASE_URL="${input.openAiBaseUrl}"`,
      '',
      'hermes-agent',
    ].join('\n'),
  };
}

export function resolveGatewayEndpoint(baseUrl: string, kind: GatewayEndpointKind): string {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (kind === 'anthropic') {
    return replaceGatewaySuffix(normalizedBaseUrl, ['anthropic']);
  }
  if (kind === 'gemini') {
    return replaceGatewaySuffix(normalizedBaseUrl, ['google', 'v1beta']);
  }
  return normalizedBaseUrl || '/v1';
}

export function resolveCurrentGatewayEndpoints(baseUrl = OPEN_API_BASE_URL) {
  return {
    openAiBaseUrl: resolveGatewayEndpoint(baseUrl, 'openai'),
    anthropicBaseUrl: resolveGatewayEndpoint(baseUrl, 'anthropic'),
    geminiBaseUrl: resolveGatewayEndpoint(baseUrl, 'gemini'),
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '/v1';
  }
  return trimmed.startsWith('/') || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `/${trimmed}`;
}

function replaceGatewaySuffix(baseUrl: string, suffix: string[]): string {
  const segments = splitUrlSegments(baseUrl);
  const baseSegments = stripProviderGatewaySuffix(segments.pathSegments);
  return buildUrlFromSegments(segments.prefix, [...baseSegments, ...suffix]);
}

function splitUrlSegments(value: string): { prefix: string; pathSegments: string[] } {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return {
        prefix: `${url.protocol}//${url.host}`,
        pathSegments: url.pathname.split('/').filter(Boolean),
      };
    } catch {
      return { prefix: '', pathSegments: value.split('/').filter(Boolean) };
    }
  }
  return { prefix: '', pathSegments: value.split('/').filter(Boolean) };
}

function stripProviderGatewaySuffix(pathSegments: string[]): string[] {
  if (endsWithSegments(pathSegments, ['google', 'v1beta'])) {
    return pathSegments.slice(0, -2);
  }
  if (endsWithSegments(pathSegments, ['anthropic'])) {
    return pathSegments.slice(0, -1);
  }
  if (endsWithSegments(pathSegments, ['v1'])) {
    return pathSegments.slice(0, -1);
  }
  return pathSegments;
}

function endsWithSegments(value: string[], suffix: string[]): boolean {
  if (suffix.length > value.length) {
    return false;
  }
  return suffix.every((segment, index) => value[value.length - suffix.length + index] === segment);
}

function buildUrlFromSegments(prefix: string, pathSegments: string[]): string {
  const path = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';
  return prefix ? `${prefix}${path}` : path || '/';
}
