/**
 * Presentational half of the footer's follow-us configuration.
 *
 * Split from `footer-settings.ts` so that data-only consumers (the admin service, the plain-Node
 * runtime tests) can read the platform registry without pulling in React or the icon library.
 */
export {
  SocialPlatformChip,
  SocialPlatformGlyph,
  SocialPlatformTile,
  assertEverySocialGlyphResolves,
} from './components/SocialPlatformGlyph.tsx';
