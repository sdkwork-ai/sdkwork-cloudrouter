import { Briefcase, Mail, Music2, type LucideIcon } from 'lucide-react';
// Extension-qualified on purpose — see the note in `components/Footer.tsx`.
import { SOCIAL_BRAND_ICONS } from '../social-icons.generated.ts';
import {
  socialGlyphColor,
  type GenericSocialGlyph,
  type SocialPlatformDefinition,
} from '../social-platforms.ts';

/**
 * The only place that binds the platform registry to concrete icon components. The registry itself
 * stays free of React imports so non-DOM consumers can read it; `assertEverySocialGlyphResolves`
 * below turns a missing binding into a build-time failure instead of a blank tile.
 */
const GENERIC_SOCIAL_GLYPHS: Record<GenericSocialGlyph, LucideIcon> = {
  briefcase: Briefcase,
  mail: Mail,
  music: Music2,
};

export function assertEverySocialGlyphResolves(platforms: readonly SocialPlatformDefinition[]): void {
  const unresolved: string[] = [];
  for (const platform of platforms) {
    if (platform.glyph.kind === 'brand') {
      if (!SOCIAL_BRAND_ICONS[platform.glyph.brand]) {
        unresolved.push(`${platform.code} (brand "${platform.glyph.brand}")`);
      }
      continue;
    }
    if (!GENERIC_SOCIAL_GLYPHS[platform.glyph.icon]) {
      unresolved.push(`${platform.code} (generic "${platform.glyph.icon}")`);
    }
  }
  if (unresolved.length > 0) {
    throw new Error(
      `Social platform registry references glyphs that are not bound: ${unresolved.join(', ')}`,
    );
  }
}

export function SocialPlatformGlyph({
  className,
  definition,
}: {
  className?: string;
  definition: SocialPlatformDefinition;
}) {
  if (definition.glyph.kind === 'brand') {
    const icon = SOCIAL_BRAND_ICONS[definition.glyph.brand];
    return (
      <svg
        aria-hidden="true"
        className={className}
        data-social-brand={definition.glyph.brand}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={icon.path} />
      </svg>
    );
  }
  const Glyph = GENERIC_SOCIAL_GLYPHS[definition.glyph.icon];
  return <Glyph aria-hidden="true" className={className} data-social-brand={definition.code} />;
}

/**
 * The chip's appearance, without the link. Split out so `/admin/site` can show the operator
 * exactly what the tile will look like while editing — a preview that navigated on click would be
 * a trap in a form.
 */
export function SocialPlatformTile({
  definition,
  muted = false,
  title,
}: {
  definition: SocialPlatformDefinition;
  /** Dims the tile to signal "configured but not shown". */
  muted?: boolean;
  title?: string;
}) {
  return (
    <span
      aria-hidden={title ? undefined : 'true'}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm ${muted ? 'opacity-40' : ''}`}
      data-cloudrouter-social-tile={definition.code}
      style={{
        backgroundColor: definition.color,
        color: socialGlyphColor(definition.color),
      }}
      title={title}
    >
      <SocialPlatformGlyph className="h-4 w-4" definition={definition} />
    </span>
  );
}

/**
 * A footer follow-us chip: solid brand tile, glyph tinted for contrast against it. Rendered here
 * rather than inline in the footer so the two surfaces cannot drift apart.
 */
export function SocialPlatformChip({
  definition,
  href,
  label,
}: {
  definition: SocialPlatformDefinition;
  href: string;
  label: string;
}) {
  return (
    <a
      aria-label={label}
      className="transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lobster-500 hover:-translate-y-0.5"
      data-cloudrouter-social={definition.code}
      href={href}
      rel="noreferrer"
      target="_blank"
      title={label}
    >
      <SocialPlatformTile definition={definition} />
    </a>
  );
}
