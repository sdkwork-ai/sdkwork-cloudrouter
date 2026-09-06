import { type GatewayEndpointKind, resolveGatewayEndpoint } from '@sdkwork/utils/gatewayEndpoint';
import { type SharedGatewayToolId } from '@sdkwork/utils/gatewayToolSnippets';
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
export declare const API_KEY_USAGE_TOOL_PROFILES: ApiKeyUsageToolProfile[];
export declare function buildApiKeyUsageToolSnippets(input: ApiKeyUsageSnippetInput): ApiKeyUsageSnippetMap;
export { resolveGatewayEndpoint };
export declare function resolveCurrentGatewayEndpoints(baseUrl?: string): import("@sdkwork/utils").GatewayEndpointSet;
//# sourceMappingURL=toolProfiles.d.ts.map