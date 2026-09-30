/**
 * Aggregate entry point for the footer's operator-facing configuration **data**.
 *
 * The `/admin/site` package consumes the same tables the footer renders from, so the two can
 * never disagree about which platforms or which regions exist.
 *
 * Deliberately free of React and icon-library imports: the admin data service and the plain-Node
 * runtime tests both import this subpath. The presentational pieces (brand glyph, follow-us chip)
 * live behind `@sdkwork/cloudroutes-pc-commons/footer-glyphs` so a Node consumer never has to
 * resolve a component tree.
 */
export {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_CODES,
  createDefaultSocialPlatformLinks,
  createEmptySocialPlatformLinks,
  isSocialPlatformCode,
  socialGlyphColor,
  socialPlatformFieldNames,
  type GenericSocialGlyph,
  type SocialPlatformCode,
  type SocialPlatformDefinition,
  type SocialPlatformLink,
  type SocialPlatformLinks,
} from './social-platforms.ts';

export {
  FOOTER_SECTIONS,
  createDefaultFooterSectionSwitches,
  type FooterSectionCode,
  type FooterSectionDefinition,
  type FooterSectionField,
  type FooterSectionSwitches,
  type FooterSectionVisibility,
} from './footer-sections.ts';

export {
  QR_CHANNELS,
  QR_UPLOAD_SLOT,
  type QrChannelCode,
  type QrChannelMediaField,
  type QrChannelVisibilityField,
} from './qr-channels.ts';
