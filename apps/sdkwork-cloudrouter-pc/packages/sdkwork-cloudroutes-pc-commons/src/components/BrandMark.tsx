import {
  DEFAULT_BRAND_LOGO_URL,
  useResolvedBrandLogoUrl,
  type SiteBranding,
} from '../siteBranding.ts';

/**
 * Rendered size of the brand mark.
 *
 * `md` is the 32px console/admin/topbar mark, `lg` the 36px footer mark. Sizes are enumerated
 * rather than taken as a number so every call site resolves to a literal Tailwind class: a
 * computed `h-[${px}px]` class would never be emitted by the compiler.
 */
export type BrandMarkSize = 'md' | 'lg';

/**
 * Plate behind an **operator-uploaded** logo.
 *
 * `dark` is the near-black plate used by the public navbar and footer (inverting to white in the
 * light theme); `translucent` is the white-on-black plate the admin chrome uses. The shipped
 * brand mark needs neither: it carries its own artwork and rounded corners.
 */
export type BrandMarkTone = 'dark' | 'translucent';

const MARK_SIZE_CLASS: Record<BrandMarkSize, string> = {
  md: 'h-8 w-8',
  lg: 'h-9 w-9',
};

const MARK_PIXEL_SIZE: Record<BrandMarkSize, number> = {
  md: 32,
  lg: 36,
};

const PLATE_SIZE_CLASS: Record<BrandMarkSize, string> = {
  md: 'h-8 w-8 rounded-lg',
  lg: 'h-9 w-9 rounded-xl',
};

const PLATE_TONE_CLASS: Record<BrandMarkTone, string> = {
  dark: 'bg-slate-900 dark:bg-white',
  translucent: 'bg-white/10',
};

/**
 * Renders the site's brand mark at a navigation size.
 *
 * Two shapes are deliberately different:
 *
 * - **Shipped mark** — the artwork already is a rounded app icon with its own background, so it is
 *   painted edge to edge. Putting it inside a tinted plate and shrinking it to 20px (the shape an
 *   uploaded logo needs) would leave a dark border boxed around a blue icon.
 * - **Uploaded logo** — an operator logo has an unknown shape and often transparent edges, so it
 *   keeps the tinted plate and `object-contain` fit that keeps it legible on both themes.
 *
 * Centralising the choice is what keeps the navbar, footer and admin header showing the same
 * mark at the same size; a per-surface decision is how they drift apart.
 */
export function BrandMark({
  branding,
  className = '',
  size = 'md',
  tone = 'dark',
}: {
  /** Site branding as published at runtime; only the logo and site name are read. */
  branding: Pick<SiteBranding, 'logo' | 'siteName'>;
  /** Extra placement classes for the outer element, such as `hidden sm:block`. */
  className?: string;
  /** Navigation size to render at. */
  size?: BrandMarkSize;
  /** Plate treatment used only for operator-uploaded logos. */
  tone?: BrandMarkTone;
}) {
  // Subscribes to the Drive share-link resolution: an uploaded logo is a `drive://` reference
  // until its reader link is exchanged for a download URL, and `resolveBrandLogoUrl` alone would
  // answer with the shipped mark forever.
  const logoUrl = useResolvedBrandLogoUrl(branding);

  if (logoUrl === DEFAULT_BRAND_LOGO_URL) {
    return (
      <img
        alt={branding.siteName}
        className={`${MARK_SIZE_CLASS[size]} shrink-0 object-contain ${className}`.trim()}
        decoding="async"
        draggable={false}
        height={MARK_PIXEL_SIZE[size]}
        src={logoUrl}
        width={MARK_PIXEL_SIZE[size]}
      />
    );
  }

  return (
    <span
      className={`${PLATE_SIZE_CLASS[size]} ${PLATE_TONE_CLASS[tone]} flex shrink-0 items-center justify-center ${className}`.trim()}
    >
      <img
        alt={branding.siteName}
        className="h-5 w-5 object-contain"
        decoding="async"
        draggable={false}
        height={20}
        src={logoUrl}
        width={20}
      />
    </span>
  );
}
