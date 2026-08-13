import type { LlmProtocolConfig } from '@sdkwork/cloudrouter-pc-admin-core/sdk';

/**
 * Vendor × region × LLM 协议 官方默认 Base URL 矩阵。
 *
 * 数据来源：sdkwork-models 目录 models/<vendor>/<region>/vendor.json 的
 * protocolBaseUrls 字段（按目录协议 code），此处映射为供应商枚举协议码：
 * openai_compatible → openai_chat_completions，其余一致。
 * region 仅 cn / global 两档，归一化见 resolveVendorProtocolDefaultUrl。
 * 仅收录有公开官方默认地址的协议；未收录的 vendor/region/协议无默认地址，
 * 表单不提示、不自动填入。volcengine 为路由种子的兼容 vendor code，
 * 与目录 bytedance 共用火山引擎 Ark 地址。
 */

type VendorRegion = 'cn' | 'global';

interface VendorProtocolEndpoint {
  host: string;
  pathPrefix: string;
}

type ProtocolBaseUrlMap = Partial<Record<LlmProtocolConfig['protocolCode'], VendorProtocolEndpoint>>;
type RegionBaseUrlMap = Partial<Record<VendorRegion, ProtocolBaseUrlMap>>;

const VENDOR_PROTOCOL_BASE_URLS: Record<string, RegionBaseUrlMap> = {
  openai: {
    global: {
      openai_chat_completions: { host: 'api.openai.com', pathPrefix: '/v1' },
      openai_responses: { host: 'api.openai.com', pathPrefix: '/v1' },
    },
  },
  anthropic: {
    global: {
      anthropic_messages: { host: 'api.anthropic.com', pathPrefix: '/v1' },
    },
  },
  deepseek: {
    cn: {
      openai_chat_completions: { host: 'api.deepseek.com', pathPrefix: '/v1' },
      openai_responses: { host: 'api.deepseek.com', pathPrefix: '/v1' },
      anthropic_messages: { host: 'api.deepseek.com', pathPrefix: '/anthropic' },
    },
    global: {
      openai_chat_completions: { host: 'api.deepseek.com', pathPrefix: '/v1' },
      openai_responses: { host: 'api.deepseek.com', pathPrefix: '/v1' },
      anthropic_messages: { host: 'api.deepseek.com', pathPrefix: '/anthropic' },
    },
  },
  google: {
    global: {
      openai_chat_completions: { host: 'generativelanguage.googleapis.com', pathPrefix: '/v1beta/openai' },
    },
  },
  alibaba: {
    cn: {
      openai_chat_completions: { host: 'dashscope.aliyuncs.com', pathPrefix: '/compatible-mode/v1' },
      openai_responses: { host: 'dashscope.aliyuncs.com', pathPrefix: '/compatible-mode/v1' },
    },
    global: {
      openai_chat_completions: { host: 'dashscope.aliyuncs.com', pathPrefix: '/compatible-mode/v1' },
      openai_responses: { host: 'dashscope.aliyuncs.com', pathPrefix: '/compatible-mode/v1' },
    },
  },
  bytedance: {
    cn: {
      openai_chat_completions: { host: 'ark.cn-beijing.volces.com', pathPrefix: '/api/v3' },
      openai_responses: { host: 'ark.cn-beijing.volces.com', pathPrefix: '/api/v3' },
    },
    global: {
      openai_chat_completions: { host: 'ark.cn-beijing.volces.com', pathPrefix: '/api/v3' },
      openai_responses: { host: 'ark.cn-beijing.volces.com', pathPrefix: '/api/v3' },
    },
  },
  volcengine: {
    cn: {
      openai_chat_completions: { host: 'ark.cn-beijing.volces.com', pathPrefix: '/api/v3' },
      openai_responses: { host: 'ark.cn-beijing.volces.com', pathPrefix: '/api/v3' },
    },
    global: {
      openai_chat_completions: { host: 'ark.cn-beijing.volces.com', pathPrefix: '/api/v3' },
      openai_responses: { host: 'ark.cn-beijing.volces.com', pathPrefix: '/api/v3' },
    },
  },
  minimax: {
    cn: {
      openai_chat_completions: { host: 'api.minimaxi.com', pathPrefix: '/v1' },
    },
    global: {
      openai_chat_completions: { host: 'api.minimaxi.com', pathPrefix: '/v1' },
    },
  },
  moonshot: {
    cn: {
      openai_chat_completions: { host: 'api.moonshot.cn', pathPrefix: '/v1' },
      anthropic_messages: { host: 'api.moonshot.cn', pathPrefix: '/anthropic' },
    },
    global: {
      openai_chat_completions: { host: 'api.moonshot.ai', pathPrefix: '/v1' },
      anthropic_messages: { host: 'api.moonshot.ai', pathPrefix: '/anthropic' },
    },
  },
  stepfun: {
    cn: {
      openai_chat_completions: { host: 'api.stepfun.com', pathPrefix: '/v1' },
      openai_responses: { host: 'api.stepfun.com', pathPrefix: '/v1' },
    },
  },
  tencent: {
    cn: {
      openai_chat_completions: { host: 'api.hunyuan.cloud.tencent.com', pathPrefix: '/v1' },
      anthropic_messages: { host: 'api.hunyuan.cloud.tencent.com', pathPrefix: '/anthropic' },
    },
  },
  xai: {
    global: {
      openai_chat_completions: { host: 'api.x.ai', pathPrefix: '/v1' },
      openai_responses: { host: 'api.x.ai', pathPrefix: '/v1' },
    },
  },
  zhipu: {
    cn: {
      openai_chat_completions: { host: 'open.bigmodel.cn', pathPrefix: '/api/paas/v4' },
      anthropic_messages: { host: 'open.bigmodel.cn', pathPrefix: '/api/anthropic' },
    },
  },
};

export interface VendorProtocolDefaultUrl {
  baseUrl: string;
  region: VendorRegion;
}

function normalizeVendorRegion(regionCode: string | null | undefined): VendorRegion {
  const normalized = (regionCode ?? '').trim().toLowerCase();
  if (['cn', 'china', 'mainland', 'china_mainland', 'zh'].includes(normalized)) return 'cn';
  return 'global';
}

export { normalizeVendorRegion };

/**
 * 某 vendor 在矩阵中收录的协议集合（cn/global 两档取并集）。
 * 返回 null 表示该 vendor 未被分析收录（如纯音视频厂商/中转伪 vendor），
 * 此时不做协议限制，全部协议可手动配置。
 */
export function vendorSupportedProtocols(vendorCode: string | null | undefined): LlmProtocolConfig['protocolCode'][] | null {
  if (!vendorCode) return null;
  const regions = VENDOR_PROTOCOL_BASE_URLS[vendorCode];
  if (!regions) return null;
  const codes = new Set<LlmProtocolConfig['protocolCode']>();
  for (const region of Object.values(regions)) {
    for (const code of Object.keys(region) as LlmProtocolConfig['protocolCode'][]) {
      codes.add(code);
    }
  }
  return [...codes];
}

/** 命中返回 {baseUrl, region}；未收录返回 undefined（region 未命中时回退 global，再回退 cn）。 */
export function resolveVendorProtocolDefaultUrl(
  vendorCode: string | null | undefined,
  regionCode: string | null | undefined,
  protocolCode: LlmProtocolConfig['protocolCode'],
): VendorProtocolDefaultUrl | undefined {
  if (!vendorCode) return undefined;
  const region = normalizeVendorRegion(regionCode);
  const vendorEndpoints = VENDOR_PROTOCOL_BASE_URLS[vendorCode];
  const endpoint = vendorEndpoints?.[region]?.[protocolCode]
    ?? vendorEndpoints?.['global']?.[protocolCode]
    ?? vendorEndpoints?.['cn']?.[protocolCode];
  if (!endpoint) return undefined;
  return { baseUrl: `https://${endpoint.host}${endpoint.pathPrefix}`, region };
}

export function vendorProtocolDefaultBaseUrl(
  vendorCode: string | null | undefined,
  regionCode: string | null | undefined,
  protocolCode: LlmProtocolConfig['protocolCode'],
): string {
  return resolveVendorProtocolDefaultUrl(vendorCode, regionCode, protocolCode)?.baseUrl ?? '';
}
