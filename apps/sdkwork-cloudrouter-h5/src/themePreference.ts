/**
 * H5 theme preference.
 *
 * The H5 renderer shares the PC portal's palette authority: the primary accent
 * stays CloudRouter blue (`#2563eb`) and surfaces follow the same slate /
 * neutral layer stack. The storage key intentionally matches the PC renderer so
 * one origin (the adaptive web ingress) keeps the same light/dark choice when a
 * visitor switches between the PC and H5 surfaces.
 */
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedThemePreference = 'light' | 'dark';

/** Shared with the PC renderer on the same origin. */
export const CLOUD_ROUTER_THEME_STORAGE_KEY = 'cloud-router-theme';

const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

/** Browser chrome colors matching the resolved canvas token. */
const THEME_COLOR_BY_PREFERENCE: Record<ResolvedThemePreference, string> = {
  light: '#f8fafc',
  dark: '#121212',
};

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveSystemThemePreference(): ResolvedThemePreference {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveEffectiveThemePreference(theme: ThemePreference): ResolvedThemePreference {
  return theme === 'system' ? resolveSystemThemePreference() : theme;
}

export function resolveInitialThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_PREFERENCE;
  }

  try {
    const storedTheme = window.localStorage.getItem(CLOUD_ROUTER_THEME_STORAGE_KEY);
    if (isThemePreference(storedTheme)) {
      return storedTheme;
    }
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }

  return DEFAULT_THEME_PREFERENCE;
}

export function persistThemePreference(theme: ThemePreference): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(CLOUD_ROUTER_THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
}

/**
 * Apply a preference to the document and return the effective scheme.
 *
 * Both `light` and `dark` classes are toggled explicitly so an explicit choice
 * beats the CSS `prefers-color-scheme` default used before hydration. The
 * `theme-color` meta tag follows the resolved canvas so the mobile browser
 * chrome matches the app surface.
 */
export function applyThemePreference(theme: ThemePreference): ResolvedThemePreference {
  const resolvedTheme = resolveEffectiveThemePreference(theme);

  if (typeof document === 'undefined') {
    return resolvedTheme;
  }

  const root = document.documentElement;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.classList.toggle('light', resolvedTheme === 'light');
  root.dataset.theme = theme;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;

  const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.content = THEME_COLOR_BY_PREFERENCE[resolvedTheme];
  }

  return resolvedTheme;
}

/** Resolve the next explicit scheme from the current effective one. */
export function nextThemePreference(current: ThemePreference): ThemePreference {
  return resolveEffectiveThemePreference(current) === 'dark' ? 'light' : 'dark';
}

export function initializeThemePreferences(): {
  theme: ThemePreference;
  resolvedTheme: ResolvedThemePreference;
} {
  const theme = resolveInitialThemePreference();
  const resolvedTheme = applyThemePreference(theme);
  return { theme, resolvedTheme };
}
