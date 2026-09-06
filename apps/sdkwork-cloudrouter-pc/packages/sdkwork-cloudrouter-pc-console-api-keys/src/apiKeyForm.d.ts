import type { ApiKeyGroupRoutingPolicy, CreateApiKeyInput } from './apiKeyService';
import type { UpdateApiKeyRequest } from '@sdkwork/cloudrouter-app-sdk';
export type ApiKeyFormValues = {
    name: string;
    /** 路由绑定分组 code 数组；第一个为默认分组 */
    accountGroups: string[];
    /** 按分组的路由策略（可选）；未配置的分组由服务端按 price_first/weight 100 落库 */
    groupRoutingPolicies?: ApiKeyGroupRoutingPolicy[];
    quota: string;
    isUnlimitedQuota: boolean;
    modalities: string[];
    ipLimit: string;
    expires: string;
    createCount: number;
    /** 按 Key 的调用链策略（可选）：启用时覆盖全局默认 */
    chain?: {
        maxInflight: string;
        allowlistText: string;
        denylistText: string;
    };
};
/** 从表单构造调用链输入；未启用（undefined）时返回 undefined。 */
export declare function chainInputFromForm(values: ApiKeyFormValues): UpdateApiKeyRequest['chain'];
export declare const DEFAULT_API_KEY_MODALITIES: readonly ["text", "image", "video", "audio", "music"];
export declare const DEFAULT_ACCOUNT_GROUP = "default-group";
export declare function createApiKeyInputFromForm(values: ApiKeyFormValues, _index?: number): CreateApiKeyInput;
export declare function createApiKeyInputsFromForm(values: ApiKeyFormValues): CreateApiKeyInput[];
//# sourceMappingURL=apiKeyForm.d.ts.map