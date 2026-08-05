import { OPEN_API_BASE_URL } from '@sdkwork/cloudroutes-pc-commons/utils/env';
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
  /** 网关为该 key 解析的模型 ID；缺省时使用 gpt-4o-mini 占位 */
  modelId?: string;
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
    fallbackSummary:
      'OpenAI-compatible provider in ~/.codex/config.toml via model_provider and [model_providers.cloudrouter].',
    endpointKind: 'openai',
    configPathKey: 'console.apiKeys.usageDetails.tools.codexPath',
    fallbackConfigPath: '~/.codex/config.toml',
    referenceKey: 'console.apiKeys.usageDetails.tools.codexReference',
    fallbackReference:
      'Codex CLI config.toml: model_provider = "cloudrouter" with [model_providers.cloudrouter] base_url, env_key, wire_api = "responses".',
  },
  {
    id: 'claude-code',
    labelKey: 'console.apiKeys.usageDetails.tools.claudeCode',
    fallbackLabel: 'Claude Code',
    summaryKey: 'console.apiKeys.usageDetails.tools.claudeCodeSummary',
    fallbackSummary:
      'Anthropic-compatible endpoint through ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN (or ~/.claude/settings.json env).',
    endpointKind: 'anthropic',
    configPathKey: 'console.apiKeys.usageDetails.tools.claudeCodePath',
    fallbackConfigPath: 'Shell environment / ~/.claude/settings.json',
    referenceKey: 'console.apiKeys.usageDetails.tools.claudeCodeReference',
    fallbackReference:
      'Claude Code reads ANTHROPIC_BASE_URL and sends the key as ANTHROPIC_AUTH_TOKEN (Bearer) or ANTHROPIC_API_KEY (x-api-key).',
  },
  {
    id: 'gemini',
    labelKey: 'console.apiKeys.usageDetails.tools.gemini',
    fallbackLabel: 'Gemini',
    summaryKey: 'console.apiKeys.usageDetails.tools.geminiSummary',
    fallbackSummary:
      'Select Gemini API Key auth in ~/.gemini/settings.json, then set GEMINI_API_KEY and GOOGLE_GEMINI_BASE_URL.',
    endpointKind: 'gemini',
    configPathKey: 'console.apiKeys.usageDetails.tools.geminiPath',
    fallbackConfigPath: '~/.gemini/settings.json + Shell env',
    referenceKey: 'console.apiKeys.usageDetails.tools.geminiReference',
    fallbackReference:
      'Gemini CLI: setting GOOGLE_GEMINI_BASE_URL alone switches to gateway auth; select "gemini-api-key" in settings.json first.',
  },
  {
    id: 'opencode',
    labelKey: 'console.apiKeys.usageDetails.tools.opencode',
    fallbackLabel: 'opencode',
    summaryKey: 'console.apiKeys.usageDetails.tools.opencodeSummary',
    fallbackSummary:
      'Custom OpenAI-compatible provider using @ai-sdk/openai-compatible in ~/.config/opencode/opencode.json.',
    endpointKind: 'openai',
    configPathKey: 'console.apiKeys.usageDetails.tools.opencodePath',
    fallbackConfigPath: '~/.config/opencode/opencode.json',
    referenceKey: 'console.apiKeys.usageDetails.tools.opencodeReference',
    fallbackReference:
      'opencode provider config with npm package @ai-sdk/openai-compatible; apiKey may reference {env:CLOUDROUTER_API_KEY}.',
  },
  {
    id: 'openclaw',
    labelKey: 'console.apiKeys.usageDetails.tools.openclaw',
    fallbackLabel: 'openclaw',
    summaryKey: 'console.apiKeys.usageDetails.tools.openclawSummary',
    fallbackSummary:
      'OpenAI-compatible provider under models.providers.cloudrouter in ~/.openclaw/openclaw.json.',
    endpointKind: 'openai',
    configPathKey: 'console.apiKeys.usageDetails.tools.openclawPath',
    fallbackConfigPath: '~/.openclaw/openclaw.json',
    referenceKey: 'console.apiKeys.usageDetails.tools.openclawReference',
    fallbackReference:
      'OpenClaw config: models.providers.<id> with baseUrl, apiKey, api: "openai-completions", and agents.defaults.model.primary.',
  },
  {
    id: 'hermes-agent',
    labelKey: 'console.apiKeys.usageDetails.tools.hermesAgent',
    fallbackLabel: 'Hermes Agent',
    summaryKey: 'console.apiKeys.usageDetails.tools.hermesAgentSummary',
    fallbackSummary:
      'OpenAI-compatible provider under providers.cloudrouter in ~/.hermes/config.yaml.',
    endpointKind: 'openai',
    configPathKey: 'console.apiKeys.usageDetails.tools.hermesAgentPath',
    fallbackConfigPath: '~/.hermes/config.yaml',
    referenceKey: 'console.apiKeys.usageDetails.tools.hermesAgentReference',
    fallbackReference:
      'Hermes Agent providers.cloudrouter block: base_url, api_key (or key_env), api_mode: openai_chat, model.',
  },
  {
    id: 'mimo-code',
    labelKey: 'console.apiKeys.usageDetails.tools.mimoCode',
    fallbackLabel: 'MiMo Code',
    summaryKey: 'console.apiKeys.usageDetails.tools.mimoCodeSummary',
    fallbackSummary:
      'OpenAI-compatible provider using @ai-sdk/openai-compatible in ~/.config/mimocode/mimocode.jsonc.',
    endpointKind: 'openai',
    configPathKey: 'console.apiKeys.usageDetails.tools.mimoCodePath',
    fallbackConfigPath: '~/.config/mimocode/mimocode.jsonc',
    referenceKey: 'console.apiKeys.usageDetails.tools.mimoCodeReference',
    fallbackReference:
      'MiMo Code (npm @mimo-ai/cli): provider.<id>.options uses exact baseURL and apiKey field names; do not append /v1 yourself.',
  },
  {
    id: 'rig',
    labelKey: 'console.apiKeys.usageDetails.tools.rig',
    fallbackLabel: 'rig',
    summaryKey: 'console.apiKeys.usageDetails.tools.rigSummary',
    fallbackSummary:
      'Rust SDK: rig::providers::openai::Client::builder() with .base_url() pointing at the OpenAI-compatible gateway.',
    endpointKind: 'openai',
    configPathKey: 'console.apiKeys.usageDetails.tools.rigPath',
    fallbackConfigPath: 'Cargo.toml + src/main.rs',
    referenceKey: 'console.apiKeys.usageDetails.tools.rigReference',
    fallbackReference:
      'rig has no config file; build a client with .api_key(...) and .base_url(...), then completion_model(...).completions_api().',
  },
];

export function buildApiKeyUsageToolSnippets(input: ApiKeyUsageSnippetInput): ApiKeyUsageSnippetMap {
  return buildSharedGatewayToolSnippets(input);
}

export { resolveGatewayEndpoint };

export function resolveCurrentGatewayEndpoints(baseUrl = OPEN_API_BASE_URL) {
  return resolveGatewayEndpoints(baseUrl);
}
