/**
 * Vendor 标准 Base URL 规则表。
 *
 * vendorCode 与资源目录（data/ai-routing/resources/core-resources.json 的
 * vendor 资源）保持一致；仅收录有公开官方标准地址的 Vendor。未收录的
 * Vendor 生成时只补 https:// 协议、不追加路径前缀。规则可随目录扩展。
 */
export interface VendorBaseUrlRule {
  /** 厂商官方 API 标准域名（不含协议与路径） */
  standardHost: string;
  /** 厂商官方 API 标准路径前缀（以 / 开头，可为空） */
  pathPrefix: string;
}

const VENDOR_BASE_URL_RULES: Record<string, VendorBaseUrlRule> = {
  openai: { standardHost: 'api.openai.com', pathPrefix: '/v1' },
  anthropic: { standardHost: 'api.anthropic.com', pathPrefix: '/v1' },
  gemini: { standardHost: 'generativelanguage.googleapis.com', pathPrefix: '/v1beta' },
  volcengine: { standardHost: 'ark.cn-beijing.volces.com', pathPrefix: '/api/v3' },
  jimeng: { standardHost: 'ark.cn-beijing.volces.com', pathPrefix: '/api/v3' },
  minimax: { standardHost: 'api.minimaxi.com', pathPrefix: '/v1' },
  kling: { standardHost: 'api.klingai.com', pathPrefix: '/v1' },
};

export function getVendorBaseUrlRule(vendorCode: string | null | undefined): VendorBaseUrlRule | undefined {
  if (!vendorCode) return undefined;
  return VENDOR_BASE_URL_RULES[vendorCode];
}

/** 规则对应的标准完整地址，如 https://api.openai.com/v1；无规则返回 undefined */
export function vendorStandardBaseUrl(vendorCode: string | null | undefined): string | undefined {
  const rule = getVendorBaseUrlRule(vendorCode);
  if (!rule) return undefined;
  return `https://${rule.standardHost}${rule.pathPrefix}`;
}

/**
 * 按 Vendor 标准生成 Base URL：
 * - 输入为空时返回标准地址（无规则返回空串）；
 * - 已含协议（完整 URL）时原样保留，结果始终可手工修改；
 * - 其余按域名处理：补 https:// 协议，并按 Vendor 规则追加标准路径前缀。
 */
export function resolveVendorBaseUrl(vendorCode: string | null | undefined, input: string): string {
  const trimmed = input.trim();
  if (trimmed === '') {
    return vendorStandardBaseUrl(vendorCode) ?? '';
  }
  if (trimmed.includes('://')) {
    return trimmed;
  }
  const rule = getVendorBaseUrlRule(vendorCode);
  const domain = trimmed.replace(/\/+$/, '');
  return `https://${domain}${rule ? rule.pathPrefix : ''}`;
}
