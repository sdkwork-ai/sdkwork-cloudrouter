// Extension-qualified on purpose — see the note in `components/Footer.tsx`: this package keeps
// stray in-place `tsc` emit (`*.js`) beside its sources and the bundler prefers `.js`.
import { type SocialBrandIconCode } from './social-icons.generated.ts';

/**
 * The footer's follow-us row is operator-configurable from `/admin/site`. This module is the
 * single source of truth for **which** platforms exist, what they default to, and how their field
 * names are spelled; the backend contract, the admin form and the footer all derive from it, so
 * adding a platform is a one-line change here plus its translations.
 *
 * The `code` doubles as the wire-format infix: `code: 'twitter'` maps to the contract fields
 * `footerSocialTwitterEnabled` / `footerSocialTwitterUrl`. `socialPlatformFieldNames()` performs
 * that mapping so nothing has to re-implement the casing rule.
 *
 * This file is deliberately free of React and icon-library imports: `siteBranding.ts` (loaded in
 * plain Node by the runtime tests) reads these tables, while the glyphs are resolved separately
 * in `components/SocialPlatformGlyph.tsx`.
 */
export const SOCIAL_PLATFORMS = [
  {
    code: 'github',
    labelKey: 'footer.socialPlatform.github',
    color: '#181717',
    glyph: { kind: 'brand', brand: 'github' },
    urlPlaceholder: 'https://github.com/your-org',
    // Shipped defaults reproduce the links that used to be hardcoded in the footer, so an
    // untouched deployment does not change appearance when this became configurable.
    defaultEnabled: true,
    defaultUrl: 'https://github.com/sdkwork-ai',
  },
  {
    code: 'twitter',
    labelKey: 'footer.socialPlatform.twitter',
    color: '#000000',
    glyph: { kind: 'brand', brand: 'x' },
    urlPlaceholder: 'https://x.com/your-handle',
    defaultEnabled: true,
    defaultUrl: 'https://twitter.com',
  },
  {
    code: 'linkedin',
    labelKey: 'footer.socialPlatform.linkedin',
    color: '#0a66c2',
    // `simple-icons` removed the LinkedIn mark upstream for trademark reasons, and the shared
    // icon dependency ships no brand marks at all. The row falls back to a generic glyph instead
    // of hand-drawing someone else's trademark.
    glyph: { kind: 'generic', icon: 'briefcase' },
    urlPlaceholder: 'https://www.linkedin.com/company/your-org',
    defaultEnabled: true,
    defaultUrl: 'https://linkedin.com',
  },
  {
    code: 'youtube',
    labelKey: 'footer.socialPlatform.youtube',
    color: '#ff0000',
    glyph: { kind: 'brand', brand: 'youtube' },
    urlPlaceholder: 'https://www.youtube.com/@your-channel',
    defaultEnabled: false,
    defaultUrl: '',
  },
  {
    code: 'weibo',
    labelKey: 'footer.socialPlatform.weibo',
    color: '#e6162d',
    glyph: { kind: 'brand', brand: 'weibo' },
    urlPlaceholder: 'https://weibo.com/your-account',
    defaultEnabled: false,
    defaultUrl: '',
  },
  {
    code: 'xiaohongshu',
    labelKey: 'footer.socialPlatform.xiaohongshu',
    color: '#ff2442',
    glyph: { kind: 'brand', brand: 'xiaohongshu' },
    urlPlaceholder: 'https://www.xiaohongshu.com/user/profile/your-id',
    defaultEnabled: false,
    defaultUrl: '',
  },
  {
    code: 'bilibili',
    labelKey: 'footer.socialPlatform.bilibili',
    color: '#00a1d6',
    glyph: { kind: 'brand', brand: 'bilibili' },
    urlPlaceholder: 'https://space.bilibili.com/your-id',
    defaultEnabled: false,
    defaultUrl: '',
  },
  {
    code: 'douyin',
    labelKey: 'footer.socialPlatform.douyin',
    // Douyin's mark is not in `simple-icons`; this is the platform's signature red rather than a
    // borrowed TikTok glyph, which would misidentify a different app.
    color: '#fe2c55',
    glyph: { kind: 'generic', icon: 'music' },
    urlPlaceholder: 'https://www.douyin.com/user/your-id',
    defaultEnabled: false,
    defaultUrl: '',
  },
  {
    code: 'zhihu',
    labelKey: 'footer.socialPlatform.zhihu',
    color: '#0084ff',
    glyph: { kind: 'brand', brand: 'zhihu' },
    urlPlaceholder: 'https://www.zhihu.com/people/your-id',
    defaultEnabled: false,
    defaultUrl: '',
  },
  {
    code: 'telegram',
    labelKey: 'footer.socialPlatform.telegram',
    color: '#26a5e4',
    glyph: { kind: 'brand', brand: 'telegram' },
    urlPlaceholder: 'https://t.me/your-channel',
    defaultEnabled: false,
    defaultUrl: '',
  },
  {
    code: 'discord',
    labelKey: 'footer.socialPlatform.discord',
    color: '#5865f2',
    glyph: { kind: 'brand', brand: 'discord' },
    urlPlaceholder: 'https://discord.gg/your-invite',
    defaultEnabled: false,
    defaultUrl: '',
  },
  {
    code: 'email',
    labelKey: 'footer.socialPlatform.email',
    color: '#475569',
    glyph: { kind: 'generic', icon: 'mail' },
    // The one platform whose link is not a web page; the backend accepts `mailto:` for it.
    urlPlaceholder: 'mailto:contact@example.com',
    defaultEnabled: true,
    defaultUrl: 'mailto:contact@sdkwork.com',
  },
] as const satisfies readonly SocialPlatformDefinition[];

export type SocialPlatformCode = (typeof SOCIAL_PLATFORMS)[number]['code'];

/** Generic glyphs used where no licence-clean brand mark exists. */
export type GenericSocialGlyph = 'briefcase' | 'mail' | 'music';

export type SocialPlatformDefinition = {
  readonly code: string;
  /** i18n key for the platform name as the operator sees it. */
  readonly labelKey: string;
  /** Tile background for the footer chip, `#`-prefixed. */
  readonly color: string;
  readonly glyph:
    | { readonly kind: 'brand'; readonly brand: SocialBrandIconCode }
    | { readonly kind: 'generic'; readonly icon: GenericSocialGlyph };
  /** Example value shown in the admin link input. */
  readonly urlPlaceholder: string;
  /** Value a fresh deployment starts with; mirrors the backend domain defaults. */
  readonly defaultEnabled: boolean;
  readonly defaultUrl: string;
};

export type SocialPlatformLink = {
  enabled: boolean;
  url: string;
};

export type SocialPlatformLinks = Record<SocialPlatformCode, SocialPlatformLink>;

export const SOCIAL_PLATFORM_CODES: readonly SocialPlatformCode[] = SOCIAL_PLATFORMS.map(
  (platform) => platform.code,
);

export function isSocialPlatformCode(value: string): value is SocialPlatformCode {
  return (SOCIAL_PLATFORM_CODES as readonly string[]).includes(value);
}

/** `github` → `{ enabled: 'footerSocialGithubEnabled', url: 'footerSocialGithubUrl' }`. */
export function socialPlatformFieldNames(code: string): { enabled: string; url: string } {
  const suffix = code.charAt(0).toUpperCase() + code.slice(1);
  return { enabled: `footerSocial${suffix}Enabled`, url: `footerSocial${suffix}Url` };
}

/**
 * The shipped follow-us configuration. Both the footer (when the payload predates a field) and
 * the admin form (as its initial value) read this, so the two cannot drift.
 */
export function createDefaultSocialPlatformLinks(): SocialPlatformLinks {
  return Object.fromEntries(
    SOCIAL_PLATFORMS.map((platform) => [
      platform.code,
      { enabled: platform.defaultEnabled, url: platform.defaultUrl },
    ]),
  ) as SocialPlatformLinks;
}

/** Every social platform registry entry with nothing switched on, for use as a base value. */
export function createEmptySocialPlatformLinks(): SocialPlatformLinks {
  return Object.fromEntries(
    SOCIAL_PLATFORM_CODES.map((code) => [code, { enabled: false, url: '' }]),
  ) as SocialPlatformLinks;
}

/**
 * Glyph colour for a solid brand tile. Chosen from perceived luminance rather than a hardcoded
 * per-platform list, so a brand colour added later still gets a legible mark.
 */
export function socialGlyphColor(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/iu.exec(hex.trim());
  if (!match) {
    return '#ffffff';
  }
  const value = match[1];
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.039_28 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.6 ? '#0f172a' : '#ffffff';
}
