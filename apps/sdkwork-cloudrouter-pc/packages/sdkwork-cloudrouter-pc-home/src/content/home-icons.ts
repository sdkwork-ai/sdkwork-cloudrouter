import type { LucideIcon } from 'lucide-react';
import {
  Code2,
  CreditCard,
  Globe,
  Image as ImageIcon,
  Layers3,
  MessageSquare,
  Mic,
  Monitor,
  Music,
  Route,
  Server,
  ShieldCheck,
  Sparkles,
  Video,
  Zap,
} from 'lucide-react';

/**
 * Icon names an operator may reference from `/admin/site`.
 *
 * The set is a closed allowlist rather than a dynamic lookup: the console offers these names as a
 * picker, and an unknown name has to degrade to a neutral glyph instead of throwing during render.
 * Names are matched case- and separator-insensitively so `shield-check`, `shieldCheck` and
 * `ShieldCheck` all resolve — an operator typing the name they see in code should not be punished
 * for the separator.
 */
const HOME_ICONS: Record<string, LucideIcon> = {
  billing: CreditCard,
  code2: Code2,
  creditcard: CreditCard,
  desktop: Monitor,
  edge: Globe,
  globe: Globe,
  image: ImageIcon,
  imageicon: ImageIcon,
  layers: Layers3,
  layers3: Layers3,
  llm: MessageSquare,
  messagesquare: MessageSquare,
  mic: Mic,
  monitor: Monitor,
  multimodal: Layers3,
  music: Music,
  route: Route,
  routing: Route,
  security: ShieldCheck,
  server: Server,
  shieldcheck: ShieldCheck,
  sparkles: Sparkles,
  unified: Code2,
  video: Video,
  zap: Zap,
  audio: Mic,
};

/** Every name the console may offer, sorted for a stable picker order. */
export const HOME_ICON_NAMES: readonly string[] = Object.keys(HOME_ICONS).sort();

function toIconKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/gu, '');
}

/**
 * Resolves an operator-supplied icon name, or `undefined` when the name is unknown or blank.
 *
 * Returning `undefined` lets callers fall back to a default glyph; returning a placeholder icon
 * here would make a typo indistinguishable from a deliberate choice.
 */
export function resolveHomeIcon(name: string | undefined): LucideIcon | undefined {
  if (typeof name !== 'string') {
    return undefined;
  }
  const key = toIconKey(name);
  return key.length > 0 ? HOME_ICONS[key] : undefined;
}
