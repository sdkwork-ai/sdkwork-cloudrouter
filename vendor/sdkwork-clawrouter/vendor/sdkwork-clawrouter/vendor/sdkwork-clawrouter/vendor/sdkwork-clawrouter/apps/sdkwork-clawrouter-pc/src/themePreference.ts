export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedThemePreference = 'light' | 'dark';
export type ThemeColorPreference = 'lobster' | 'blue' | 'emerald' | 'violet' | 'amber';

export const CLAW_ROUTER_THEME_STORAGE_KEY = 'claw-router-theme';
export const CLAW_ROUTER_THEME_COLOR_STORAGE_KEY = 'claw-router-theme-color';

const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';
const DEFAULT_THEME_COLOR_PREFERENCE: ThemeColorPreference = 'lobster';

const THEME_COLOR_PALETTES: Record<ThemeColorPreference, Record<string, string>> = {
  lobster: {
    '50': '#fdf3f2',
    '100': '#fbe4e2',
    '200': '#f8c8c1',
    '300': '#f59a8c',
    '400': '#ef705d',
    '500': '#e55039',
    '600': '#c83f2a',
    '700': '#9f3020',
    '900': '#641e13',
  },
  blue: {
    '50': '#eff6ff',
    '100': '#dbeafe',
    '200': '#bfdbfe',
    '300': '#93c5fd',
    '400': '#60a5fa',
    '500': '#2563eb',
    '600': '#1d4ed8',
    '700': '#1e40af',
    '900': '#1e3a8a',
  },
  emerald: {
    '50': '#ecfdf5',
    '100': '#d1fae5',
    '200': '#a7f3d0',
    '300': '#6ee7b7',
    '400': '#34d399',
    '500': '#059669',
    '600': '#047857',
    '700': '#065f46',
    '900': '#064e3b',
  },
  violet: {
    '50': '#f5f3ff',
    '100': '#ede9fe',
    '200': '#ddd6fe',
    '300': '#c4b5fd',
    '400': '#a78bfa',
    '500': '#7c3aed',
    '600': '#6d28d9',
    '700': '#5b21b6',
    '900': '#4c1d95',
  },
  amber: {
    '50': '#fffbeb',
    '100': '#fef3c7',
    '200': '#fde68a',
    '300': '#fcd34d',
    '400': '#fbbf24',
    '500': '#d97706',
    '600': '#b45309',
    '700': '#92400e',
    '900': '#78350f',
  },
};

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function isThemeColorPreference(value: unknown): value is ThemeColorPreference {
  return value === 'lobster' || value === 'blue' || value === 'emerald' || value === 'violet' || value === 'amber';
}

export function resolveSystemThemePreference(): ResolvedThemePreference {
  if (typeof window === 'undefined') {
    return 'dark';
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
    const storedTheme = window.localStorage.getItem(CLAW_ROUTER_THEME_STORAGE_KEY);
    if (isThemePreference(storedTheme)) {
      return storedTheme;
    }
  } catch {
    // Continue to system preference when storage is unavailable.
  }

  return DEFAULT_THEME_PREFERENCE;
}

export function persistThemePreference(theme: ThemePreference): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(CLAW_ROUTER_THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
}

export function resolveInitialThemeColorPreference(): ThemeColorPreference {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_COLOR_PREFERENCE;
  }

  try {
    const storedThemeColor = window.localStorage.getItem(CLAW_ROUTER_THEME_COLOR_STORAGE_KEY);
    if (isThemeColorPreference(storedThemeColor)) {
      return storedThemeColor;
    }
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }

  return DEFAULT_THEME_COLOR_PREFERENCE;
}

export function persistThemeColorPreference(themeColor: ThemeColorPreference): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(CLAW_ROUTER_THEME_COLOR_STORAGE_KEY, themeColor);
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
}

export function applyThemePreference(theme: ThemePreference): ResolvedThemePreference {
  const resolvedTheme = resolveEffectiveThemePreference(theme);

  if (typeof document === 'undefined') {
    return resolvedTheme;
  }

  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.resolvedTheme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;

  return resolvedTheme;
}

export function applyThemeColorPreference(themeColor: ThemeColorPreference): void {
  if (typeof document === 'undefined') {
    return;
  }

  const palette = THEME_COLOR_PALETTES[themeColor] ?? THEME_COLOR_PALETTES[DEFAULT_THEME_COLOR_PREFERENCE];
  const root = document.documentElement;

  root.dataset.themeColor = themeColor;
  root.style.setProperty('--claw-router-accent', palette['500']);
  root.style.setProperty('--claw-router-accent-soft', palette['100']);
  root.style.setProperty('--color-lobster-500', palette['500']);

  for (const [shade, color] of Object.entries(palette)) {
    if (shade === '500') {
      continue;
    }
    root.style.setProperty(`--color-lobster-${shade}`, color);
  }
}

export function initializeThemePreferences(): {
  theme: ThemePreference;
  resolvedTheme: ResolvedThemePreference;
  themeColor: ThemeColorPreference;
} {
  const theme = resolveInitialThemePreference();
  const resolvedTheme = applyThemePreference(theme);
  const themeColor = resolveInitialThemeColorPreference();
  applyThemeColorPreference(themeColor);

  return { theme, resolvedTheme, themeColor };
}
