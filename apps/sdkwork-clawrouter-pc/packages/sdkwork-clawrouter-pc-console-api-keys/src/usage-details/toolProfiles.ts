import { OPEN_API_BASE_URL } from '@sdkwork/clawroutes-pc-commons/utils/env';
import {
  type GatewayEndpointKind,
  resolveGatewayEndpoint,
  resolveGatewayEndpoints,
} from '@sdkwork/utils/gatewayEndpoint';
import {
  buildSharedGatewayToolSnippets,
  type SharedGatewayToolId,
} from '@sdkwork/utils/gatewayToolSnippets';

export type ApiKeyUsageToolId = SharedGatewayToolId;

export type { GatewayEndpointKind };

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
    fallbackSummary: 'OpenAI-compatible provider in ~/.openclaw/config.yaml.',
    endpointKind: 'openai',
    configPathKey: 'console.apiKeys.usageDetails.tools.openclawPath',
    fallbackConfigPath: '~/.openclaw/config.yaml',
    referenceKey: 'console.apiKeys.usageDetails.tools.openclawReference',
    fallbackReference: 'OpenClaw config: openai-compatible provider block under providers.',
  },
  {
    id: 'hermes-agent',
    labelKey: 'console.apiKeys.usageDetails.tools.hermesAgent',
    fallbackLabel: 'Hermes Agent',
    summaryKey: 'console.apiKeys.usageDetails.tools.hermesAgentSummary',
    fallbackSummary: 'OpenAI-compatible provider in ~/.hermes/agent.yaml.',
    endpointKind: 'openai',
    configPathKey: 'console.apiKeys.usageDetails.tools.hermesAgentPath',
    fallbackConfigPath: '~/.hermes/agent.yaml',
    referenceKey: 'console.apiKeys.usageDetails.tools.hermesAgentReference',
    fallbackReference: 'Hermes Agent provider block with protocol openai, baseUrl, and apiKey credentials.',
  },
];

export function buildApiKeyUsageToolSnippets(input: ApiKeyUsageSnippetInput): ApiKeyUsageSnippetMap {
  return buildSharedGatewayToolSnippets(input);
}

export { resolveGatewayEndpoint };

export function resolveCurrentGatewayEndpoints(baseUrl = OPEN_API_BASE_URL) {
  return resolveGatewayEndpoints(baseUrl);
}
