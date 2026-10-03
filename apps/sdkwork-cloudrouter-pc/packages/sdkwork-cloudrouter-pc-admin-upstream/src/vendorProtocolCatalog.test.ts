import { describe, expect, it } from 'vitest';
import { VENDOR_CATALOG_MATRIX } from './generated/vendorCatalogMatrix.generated';
import {
  normalizeVendorRegion,
  resolveVendorBaseUrl,
  resolveVendorProtocolDefaultUrl,
  vendorAddressUnavailableReason,
  vendorDefaultBaseUrl,
  vendorNativeBaseUrl,
  vendorStandardBaseUrl,
  vendorSupportedProtocols,
} from './vendorProtocolCatalog';

/**
 * Guards the vendor -> official Base URL projection the supplier form depends on.
 *
 * Every assertion here corresponds to a way the retired hand-written tables
 * failed silently: a vendor code the catalog spells differently (`gemini` vs
 * `google`) resolved to nothing, vendors present in the catalog were missing
 * from the copy altogether (`baidu`, `meituan`, `xiaomi`), and media-only
 * vendors had no official address at all.
 */

describe('vendor protocol catalog projection', () => {
  it('resolves aliased routing vendor codes to their catalog publisher', () => {
    // `gemini` is the Cloud Router routing code; the catalog publishes `google`.
    expect(VENDOR_CATALOG_MATRIX.gemini.catalogVendorCode).toBe('google');
    expect(vendorSupportedProtocols('gemini')).toEqual(['openai_chat_completions']);
    expect(resolveVendorProtocolDefaultUrl('gemini', 'global', 'openai_chat_completions')?.baseUrl)
      .toBe('https://generativelanguage.googleapis.com/v1beta/openai');

    // `volcengine` and `bytedance` both dial Volcengine Ark, published as `bytedance`.
    expect(VENDOR_CATALOG_MATRIX.volcengine.catalogVendorCode).toBe('bytedance');
    expect(vendorSupportedProtocols('volcengine')).toEqual(['openai_chat_completions', 'openai_responses']);

    // `kling` is Kuaishou's model family.
    expect(VENDOR_CATALOG_MATRIX.kling.catalogVendorCode).toBe('kuaishou');
  });

  it('resolves every vendor the catalog publishes, including the ones the old table omitted', () => {
    // `baidu`, `meituan` and `xiaomi` all publish official protocol endpoints in
    // the catalog but were absent from the retired hand-written copy.
    expect(vendorSupportedProtocols('baidu')).toContain('openai_chat_completions');
    expect(resolveVendorProtocolDefaultUrl('baidu', 'cn', 'openai_chat_completions')?.baseUrl)
      .toBe('https://qianfan.baidubce.com/v2');

    expect(vendorSupportedProtocols('meituan')).toEqual(['openai_chat_completions', 'anthropic_messages']);
    expect(resolveVendorProtocolDefaultUrl('meituan', 'cn', 'anthropic_messages')?.baseUrl)
      .toBe('https://api.longcat.chat/anthropic');

    expect(vendorSupportedProtocols('xiaomi')).toEqual(['openai_chat_completions', 'anthropic_messages']);
    expect(resolveVendorProtocolDefaultUrl('xiaomi', 'cn', 'anthropic_messages')?.baseUrl)
      .toBe('https://api.xiaomimimo.com/anthropic');
  });

  it('reports an empty protocol set, plus a native address, for media-only vendors', () => {
    // An empty set is a positive statement: this vendor publishes no LLM API
    // protocol, so the form must stop demanding one rather than show it as
    // "not described" (which would leave every checkbox enabled).
    expect(vendorSupportedProtocols('kling')).toEqual([]);
    expect(vendorDefaultBaseUrl('kling', 'cn')).toBe('https://api-beijing.klingai.com');
    expect(vendorNativeBaseUrl('kling', 'global')).toBe('https://api-singapore.klingai.com');

    expect(vendorSupportedProtocols('runway')).toEqual([]);
    expect(vendorNativeBaseUrl('runway', 'global')).toBe('https://api.dev.runwayml.com/v1');
  });

  it('leaves vendors the catalog does not publish unrestricted', () => {
    // `openai_compatible` is an aggregator shape, not a publisher: it has no
    // official host, so `null` keeps today's operator-configured behaviour.
    expect(VENDOR_CATALOG_MATRIX.openai_compatible.catalogVendorCode).toBeNull();
    expect(vendorSupportedProtocols('openai_compatible')).toBeNull();
    expect(vendorDefaultBaseUrl('openai_compatible', 'global')).toBeUndefined();

    expect(vendorSupportedProtocols('not_a_vendor')).toBeNull();
    expect(vendorSupportedProtocols(null)).toBeNull();
  });

  it('falls back to the other region only for single-region vendors', () => {
    // Mainland-only vendors still resolve for an operator whose selector is on global.
    expect(vendorDefaultBaseUrl('stepfun', 'global')).toBe('https://api.stepfun.com/v1');

    // PixVerse publishes a global host but no fixed mainland host, so a
    // mainland supplier must NOT inherit the global one.
    expect(vendorNativeBaseUrl('pixverse', 'global')).toBe('https://app-api.pixverse.ai/openapi/v2');
    expect(vendorNativeBaseUrl('pixverse', 'cn')).toBeUndefined();
    expect(vendorDefaultBaseUrl('pixverse', 'cn')).toBeUndefined();
  });

  it('normalises the region selector onto the two catalog halves', () => {
    expect(normalizeVendorRegion('cn')).toBe('cn');
    expect(normalizeVendorRegion('china_mainland')).toBe('cn');
    expect(normalizeVendorRegion('zh')).toBe('cn');
    expect(normalizeVendorRegion('global')).toBe('global');
    expect(normalizeVendorRegion('')).toBe('global');
    expect(normalizeVendorRegion(null)).toBe('global');
  });

  it('turns an operator-typed host into the vendor standard address', () => {
    expect(resolveVendorBaseUrl('openai', 'global', '')).toBe('https://api.openai.com/v1');
    expect(resolveVendorBaseUrl('openai', 'global', 'api.openai.com')).toBe('https://api.openai.com/v1');
    expect(resolveVendorBaseUrl('openai', 'global', 'https://relay.example.com/v1')).toBe('https://relay.example.com/v1');
    expect(resolveVendorBaseUrl('kling', 'cn', '')).toBe('https://api-beijing.klingai.com');
    expect(vendorStandardBaseUrl('kling', 'cn')).toBe('https://api-beijing.klingai.com');
  });

  it('publishes only absolute https endpoints', () => {
    for (const [vendorCode, entry] of Object.entries(VENDOR_CATALOG_MATRIX)) {
      for (const [regionCode, region] of Object.entries(entry.regions)) {
        const urls = [...Object.values(region.protocols), region.nativeBaseUrl].filter((value): value is string => Boolean(value));
        for (const url of urls) {
          expect(url, `${vendorCode}/${regionCode}`).toMatch(/^https:\/\/[a-z0-9][a-z0-9.-]*(:\d+)?(\/|$)/);
        }
      }
    }
  });

  it('never ships a described vendor without an answer', () => {
    // A vendor the catalog describes must either publish an address or say why
    // it does not, otherwise the operator sees empty fields with no explanation
    // — which is exactly the bug this projection replaced.
    for (const [vendorCode, entry] of Object.entries(VENDOR_CATALOG_MATRIX)) {
      if (entry.catalogVendorCode === null) continue;
      const regions = Object.values(entry.regions);
      const answered = regions.some((region) => Object.keys(region.protocols).length > 0 || Boolean(region.nativeBaseUrl));
      expect(
        answered || Boolean(entry.addressUnavailable),
        `${vendorCode} is described by the catalog but neither publishes an address nor explains its absence`,
      ).toBe(true);
    }
  });

  it('explains rather than invents an address for a vendor with no official API', () => {
    // Suno publishes no public API. The console must show why the field is
    // empty and must never fall back to a reseller host.
    expect(VENDOR_CATALOG_MATRIX.suno.catalogVendorCode).toBe('suno');
    expect(vendorAddressUnavailableReason('suno')).toMatch(/no official public API/i);
    expect(vendorNativeBaseUrl('suno', 'global')).toBeUndefined();
    expect(vendorDefaultBaseUrl('suno', 'global')).toBeUndefined();
    // The declared endpoints must stay empty; the reason text is prose and may
    // name the resellers it is warning about.
    const sunoRegions = Object.values(VENDOR_CATALOG_MATRIX.suno.regions);
    expect(sunoRegions.every((region) => Object.keys(region.protocols).length === 0 && !region.nativeBaseUrl)).toBe(true);
  });

  it('prefills Base URLs the router dials without duplicating a version segment', () => {
    // The Anthropic SDK appends `/v1/messages` itself, so the stored Base URL
    // must be the bare origin: a stored `/v1` dials /v1/v1/messages.
    expect(resolveVendorProtocolDefaultUrl('anthropic', 'global', 'anthropic_messages')?.baseUrl)
      .toBe('https://api.anthropic.com');

    // The OpenAI family is the opposite: its Base URL carries the version,
    // because the transport strips a leading `/v1` from the inbound path when
    // the Base URL already ends with `/v1`.
    expect(resolveVendorProtocolDefaultUrl('openai', 'global', 'openai_chat_completions')?.baseUrl)
      .toBe('https://api.openai.com/v1');
    // A vendor Anthropic-compatible *surface* keeps its surface segment.
    expect(resolveVendorProtocolDefaultUrl('deepseek', 'cn', 'anthropic_messages')?.baseUrl)
      .toBe('https://api.deepseek.com/anthropic');
  });

  it('keeps region hosts distinct where the vendor publishes separate ones', () => {
    // Each of these pairs was previously stored as one host for both regions,
    // which prefilled a mainland host into an international supplier (and the
    // vendors' own docs warn that a region/key mismatch returns 401).
    expect(resolveVendorProtocolDefaultUrl('alibaba', 'cn', 'openai_chat_completions')?.baseUrl)
      .toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');
    expect(resolveVendorProtocolDefaultUrl('alibaba', 'global', 'openai_chat_completions')?.baseUrl)
      .toBe('https://dashscope-intl.aliyuncs.com/compatible-mode/v1');

    expect(resolveVendorProtocolDefaultUrl('bytedance', 'cn', 'openai_chat_completions')?.baseUrl)
      .toBe('https://ark.cn-beijing.volces.com/api/v3');
    expect(resolveVendorProtocolDefaultUrl('bytedance', 'global', 'openai_chat_completions')?.baseUrl)
      .toBe('https://ark.ap-southeast.bytepluses.com/api/v3');

    expect(resolveVendorProtocolDefaultUrl('minimax', 'cn', 'openai_chat_completions')?.baseUrl)
      .toBe('https://api.minimax.cn/v1');
    expect(resolveVendorProtocolDefaultUrl('minimax', 'global', 'openai_chat_completions')?.baseUrl)
      .toBe('https://api.minimax.io/v1');

    // Vendors that genuinely run one global endpoint keep identical rows.
    expect(resolveVendorProtocolDefaultUrl('deepseek', 'cn', 'openai_chat_completions')?.baseUrl)
      .toBe(resolveVendorProtocolDefaultUrl('deepseek', 'global', 'openai_chat_completions')?.baseUrl);
  });

  it('follows a vendor whose documented API host was superseded', () => {
    // Tencent's legacy Hunyuan platform was documented as offline 2026-09-30;
    // TokenHub serves every protocol from one origin.
    expect(resolveVendorProtocolDefaultUrl('tencent', 'cn', 'openai_chat_completions')?.baseUrl)
      .toBe('https://tokenhub.tencentmaas.com/v1');
    expect(resolveVendorProtocolDefaultUrl('tencent', 'cn', 'anthropic_messages')?.baseUrl)
      .toBe('https://tokenhub.tencentmaas.com');
  });

  it('composes every projected Base URL into a well-formed dial URL', () => {
    // Mirror of the transport rule (ProviderPassthroughTarget::build_uri plus
    // the OpenAI-only `/v1` normalisation) so a catalog value that only breaks
    // in combination with a protocol's operation path is caught here too.
    const OPERATION = {
      openai_chat_completions: { path: '/chat/completions', stripsV1: true },
      openai_responses: { path: '/responses', stripsV1: true },
      anthropic_messages: { path: '/v1/messages', stripsV1: false },
    } as const;

    for (const [vendorCode, entry] of Object.entries(VENDOR_CATALOG_MATRIX)) {
      for (const [regionCode, region] of Object.entries(entry.regions)) {
        for (const [protocolCode, baseUrl] of Object.entries(region.protocols)) {
          const operation = OPERATION[protocolCode as keyof typeof OPERATION];
          const basePath = new URL(baseUrl).pathname.replace(/\/+$/, '');
          const path = operation.stripsV1 && (basePath === '/v1' || basePath.endsWith('/v1'))
            ? operation.path.replace(/^\/v1(?=\/)/, '')
            : operation.path;
          const dialed = new URL(`${baseUrl.replace(/\/+$/, '')}${path}`);
          const where = `${vendorCode}/${regionCode} ${protocolCode}`;
          expect(dialed.pathname, `${where} doubles a version segment`).not.toMatch(/\/(v\d+[a-z]*)\/\1\//);
          expect(dialed.pathname, `${where} has an empty path segment`).not.toContain('//');
        }
      }
    }
  });
});
