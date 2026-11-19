import {
  Bot,
  Camera,
  Cpu,
  Gamepad2,
  Glasses,
  Headphones,
  Keyboard,
  Lamp,
  Lock,
  Monitor,
  Network,
  Plane,
  Power,
  Printer,
  Radio,
  Router,
  Speaker,
  Watch,
  type LucideIcon,
} from 'lucide-react';

import {
  resolveHardwareGlyphKind,
  type HardwareGlyphKind,
} from '../catalog/hardwareMarketCatalog.ts';

/**
 * Product visual for a catalog product.
 *
 * The buyer-facing catalog API publishes product identity and price, not media,
 * so the market renders a deterministic brand tile instead of inventing an
 * image URL. The hue is derived from the product seed, which keeps a product's
 * tile stable across visits, and the glyph comes from the product and category
 * copy so a camera still reads as a camera.
 */

const GLYPHS: Record<HardwareGlyphKind, LucideIcon> = {
  ar: Glasses,
  camera: Camera,
  chip: Cpu,
  console: Gamepad2,
  display: Monitor,
  drone: Plane,
  headphones: Headphones,
  hub: Network,
  keyboard: Keyboard,
  lamp: Lamp,
  lock: Lock,
  power: Power,
  printer: Printer,
  robot: Bot,
  router: Router,
  sensor: Radio,
  speaker: Speaker,
  watch: Watch,
};

const SIZE_CLASSES = {
  compact: { frame: 'h-14 w-14 rounded-xl', icon: 'h-6 w-6' },
  card: { frame: 'aspect-[4/3] w-full rounded-2xl', icon: 'h-12 w-12' },
  hero: { frame: 'aspect-[4/3] w-full rounded-3xl', icon: 'h-20 w-20' },
} as const;

export interface HardwareGlyphProps {
  seed: string;
  name: string;
  categoryName?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }
  return hash;
}

export function HardwareGlyph({
  seed,
  name,
  categoryName,
  size = 'card',
  className = '',
}: HardwareGlyphProps) {
  const kind = resolveHardwareGlyphKind(name, categoryName);
  const Icon = GLYPHS[kind];
  const hue = hashSeed(`${seed}${name}`);
  const sizes = SIZE_CLASSES[size];
  const highlight = `hsl(${hue} 72% 58%)`;
  const shade = `hsl(${(hue + 42) % 360} 68% 38%)`;

  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden ${sizes.frame} ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${highlight} 0%, ${shade} 100%)`,
      }}
    >
      <span
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <span
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/25 blur-2xl"
      />
      <Icon className={`relative ${sizes.icon} text-white drop-shadow-sm`} aria-hidden="true" strokeWidth={1.5} />
    </div>
  );
}
