import type { AppApiKeyListResponse as SdkAppApiKeyListResponse, UpdateApiKeyRequest } from '@sdkwork/cloudrouter-app-sdk';
export type ApiKeyGroupRoutingStrategy = 'weighted' | 'price_first' | 'quality_first';
/** API Key × 分组绑定的路由策略（响应侧） */
export interface ApiKeyGroupBinding {
    accountGroup: string;
    routingStrategy: ApiKeyGroupRoutingStrategy;
    weight: number;
    priority: number;
}
/** 请求侧分组路由策略；缺省由服务端按 price_first/weight 100 落库 */
export interface ApiKeyGroupRoutingPolicy {
    accountGroup: string;
    routingStrategy?: ApiKeyGroupRoutingStrategy;
    weight?: number;
}
export interface ApiKey {
    id: SdkAppApiKeyListResponse['items'][number]['id'];
    name: SdkAppApiKeyListResponse['items'][number]['name'];
    displayName: string;
    maskedKey: string & SdkAppApiKeyListResponse['items'][number]['maskedKey'];
    rawKey: string | null;
    accountGroup: string;
    accountGroupName: string | null;
    /** 路由绑定分组 code 数组（priority 序，含默认分组） */
    accountGroups: string[];
    /** 路由绑定分组策略（priority 序，含默认分组） */
    groupBindings: ApiKeyGroupBinding[];
    rate: SdkAppApiKeyListResponse['items'][number]['rate'];
    quota: SdkAppApiKeyListResponse['items'][number]['quota'];
    usedQuota: SdkAppApiKeyListResponse['items'][number]['usedQuota'];
    modalities: SdkAppApiKeyListResponse['items'][number]['modalities'];
    ipLimit: SdkAppApiKeyListResponse['items'][number]['ipLimit'];
    created: SdkAppApiKeyListResponse['items'][number]['created'];
    expires: SdkAppApiKeyListResponse['items'][number]['expires'];
    status: SdkAppApiKeyListResponse['items'][number]['status'];
    defaultForRuntime: SdkAppApiKeyListResponse['items'][number]['defaultForRuntime'];
}
export interface AccountGroup {
    id: string;
    code: string;
    name: string;
    description: string | null;
    /** 销售倍率（app 面不暴露成本倍率） */
    rate: string | null;
    /** 分组默认路由策略（参考展示；绑定策略缺省 price_first 时不依赖它） */
    routingStrategy: string | null;
    vendorCode: string | null;
    modalities: string[];
    tags: string[];
}
export interface CreateApiKeyInput {
    name: string;
    /** 按 Key 的调用链策略（可选）：maxInflight 为字符串形式的整数（int64-as-string） */
    chain?: UpdateApiKeyRequest['chain'];
    /** 路由绑定分组 code 数组；第一个为默认分组 */
    accountGroups: string[];
    /** 按分组的路由策略（可选）；缺省分组由服务端按 price_first/weight 100 落库 */
    groupRoutingPolicies?: ApiKeyGroupRoutingPolicy[];
    quota: string;
    isUnlimitedQuota: boolean;
    modalities: string[];
    ipLimit: string;
    expires: string;
    defaultForRuntime?: boolean;
}
export interface CreatedApiKey {
    key: ApiKey;
    rawKey: string;
}
type UpdateApiKeyInput = Partial<CreateApiKeyInput>;
type ApiKeyListFilters = Record<string, unknown>;
type ApiKeyListPage = {
    keys: ApiKey[];
    total: number;
};
export declare class ApiKeyService {
    static fetchKeys(filters?: ApiKeyListFilters): Promise<ApiKeyListPage>;
    static fetchGroups(): Promise<AccountGroup[]>;
    static createKey(input: CreateApiKeyInput): Promise<CreatedApiKey>;
    static updateKey(keyId: string, input: UpdateApiKeyInput): Promise<ApiKey>;
    static deleteKey(keyId: string): Promise<void>;
}
export {};
//# sourceMappingURL=apiKeyService.d.ts.map