/**
 * Localized display names for pricing catalog data. The catalog API only
 * carries stable codes (vendor/region/operation/meter), so display names are
 * resolved here with locale-aware dictionaries and a humanized-code fallback.
 * Keep the vendor dictionary aligned with the catalog registry in
 * sdkwork-models (vendors.json) and the router-service localized vendor seed.
 */

type LocalizedName = { en: string; zh: string };

const VENDOR_DISPLAY_NAMES: Record<string, LocalizedName> = {
  openai: { en: 'OpenAI', zh: 'OpenAI' },
  openai_compatible: { en: 'OpenAI Compatible', zh: 'OpenAI 兼容' },
  anthropic: { en: 'Anthropic', zh: 'Anthropic' },
  google: { en: 'Google', zh: '谷歌' },
  gemini: { en: 'Gemini', zh: '谷歌 Gemini' },
  xai: { en: 'xAI', zh: 'xAI' },
  alibaba: { en: 'Alibaba Cloud', zh: '阿里云' },
  deepseek: { en: 'DeepSeek', zh: 'DeepSeek' },
  moonshot: { en: 'Moonshot Kimi', zh: '月之暗面 Kimi' },
  zhipu: { en: 'Zhipu AI', zh: '智谱 AI' },
  runway: { en: 'Runway', zh: 'Runway' },
  baidu: { en: 'Baidu AI Cloud', zh: '百度智能云' },
  luma_ai: { en: 'Luma AI', zh: 'Luma AI' },
  vidu: { en: 'Vidu', zh: 'Vidu' },
  kling: { en: 'Kling', zh: '可灵' },
  jimeng: { en: 'Jimeng', zh: '即梦' },
  pixverse: { en: 'PixVerse', zh: 'PixVerse' },
  tencent: { en: 'Tencent Cloud', zh: '腾讯云' },
  bytedance: { en: 'ByteDance', zh: '字节跳动' },
  minimax: { en: 'MiniMax', zh: 'MiniMax' },
  stepfun: { en: 'StepFun', zh: '阶跃星辰' },
  kuaishou: { en: 'Kuaishou', zh: '快手' },
  meituan: { en: 'Meituan', zh: '美团' },
  stability_ai: { en: 'Stability AI', zh: 'Stability AI' },
  black_forest_labs: { en: 'Black Forest Labs', zh: 'Black Forest Labs' },
  suno: { en: 'Suno', zh: 'Suno' },
  mureka: { en: 'Mureka', zh: 'Mureka' },
  elevenlabs: { en: 'ElevenLabs', zh: 'ElevenLabs' },
  xiaomi: { en: 'Xiaomi MiMo', zh: '小米 MiMo' },
  volcengine: { en: 'Volcengine', zh: '火山引擎' },
};

const REGION_DISPLAY_NAMES: Record<string, LocalizedName> = {
  global: { en: 'Global', zh: '全球' },
  cn: { en: 'China (Mainland)', zh: '中国大陆' },
  us: { en: 'United States', zh: '美国' },
  us_east_1: { en: 'US East (N. Virginia)', zh: '美国东部（弗吉尼亚北部）' },
  us_west_1: { en: 'US West (N. California)', zh: '美国西部（北加利福尼亚）' },
  us_west_2: { en: 'US West (Oregon)', zh: '美国西部（俄勒冈）' },
  eu_west_1: { en: 'Europe (Ireland)', zh: '欧洲（爱尔兰）' },
  eu_central_1: { en: 'Europe (Frankfurt)', zh: '欧洲（法兰克福）' },
  ap_southeast_1: { en: 'Asia Pacific (Singapore)', zh: '亚太（新加坡）' },
  ap_northeast_1: { en: 'Asia Pacific (Tokyo)', zh: '亚太（东京）' },
  ap_south_1: { en: 'Asia Pacific (Mumbai)', zh: '亚太（孟买）' },
  ap_east_1: { en: 'Asia Pacific (Hong Kong)', zh: '亚太（香港）' },
};

/** Maps any app language tag to the dictionary locale used by this module. */
export function dataNameLocale(language: string): 'en' | 'zh' {
  return language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function localizedName(
  dictionaries: Record<string, LocalizedName>,
  code: string,
  locale: 'en' | 'zh',
  fallback: string,
): string {
  return dictionaries[code]?.[locale] ?? fallback;
}

export function vendorDisplayName(vendorCode: string, language: string): string {
  const code = vendorCode.trim();
  if (!code) return code;
  return localizedName(VENDOR_DISPLAY_NAMES, code, dataNameLocale(language), humanizeCode(code));
}

export function regionDisplayName(regionCode: string, language: string): string {
  const code = regionCode.trim();
  if (!code) return code;
  return localizedName(REGION_DISPLAY_NAMES, code, dataNameLocale(language), humanizeCode(code));
}

export function humanizeCode(value: string): string {
  return value.replace(/[._-]+/gu, ' ').replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
