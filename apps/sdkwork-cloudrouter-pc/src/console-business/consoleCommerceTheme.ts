import type { CSSProperties } from 'react';
import {
  createSdkworkTheme,
  createThemeHostCssVariables,
  type SdkworkThemeColor,
  type SdkworkThemeOverrides,
} from '@sdkwork/ui-pc-react/theme';

import type { ThemeColorPreference } from '../themePreference.ts';

const SDK_COMMERCE_THEME_VAR_KEYS = [
  '--sdk-color-brand-primary',
  '--sdk-color-brand-primary-hover',
  '--sdk-color-brand-primary-soft',
  '--sdk-color-brand-accent',
  '--sdk-color-surface-canvas',
  '--sdk-color-surface-panel',
  '--sdk-color-surface-panel-muted',
  '--sdk-color-surface-elevated',
  '--sdk-color-surface-overlay',
  '--sdk-color-text-primary',
  '--sdk-color-text-secondary',
  '--sdk-color-text-muted',
  '--sdk-color-text-inverse',
  '--sdk-color-border-subtle',
  '--sdk-color-border-default',
  '--sdk-color-border-strong',
  '--sdk-color-border-focus',
  '--sdk-color-state-success',
  '--sdk-color-state-warning',
  '--sdk-color-state-danger',
  '--sdk-color-state-info',
  '--sdk-radius-control',
  '--sdk-radius-field',
  '--sdk-radius-panel',
  '--sdk-radius-pill',
  '--sdk-shadow-soft',
  '--sdk-shadow-sm',
  '--sdk-shadow-md',
  '--sdk-shadow-lg',
] as const;

type SdkCommerceThemeVariableKey = (typeof SDK_COMMERCE_THEME_VAR_KEYS)[number];
type SdkCommerceThemeStyle = CSSProperties & Partial<Record<SdkCommerceThemeVariableKey, string>>;

function mapConsoleThemeColor(themeColor: ThemeColorPreference): SdkworkThemeColor {
  switch (themeColor) {
    case 'blue':
      return 'tech-blue';
    case 'emerald':
      return 'green-tech';
    case 'violet':
      return 'violet';
    case 'amber':
      return 'rose';
    case 'lobster':
    default:
      return 'lobster';
  }
}

// The SDKWork commerce theme defaults to a zinc palette, while the console
// shell uses a slate palette (light: slate-50 canvas / white cards; dark:
// #121212 canvas / #252525 cards / #1e1e1e sidebar). These overrides keep
// every console commerce surface (settlements, wallet, dialogs) visually
// aligned with the active console theme background.
const CONSOLE_COMMERCE_SURFACE_OVERRIDES: Record<'light' | 'dark', SdkworkThemeOverrides> = {
  light: {
    surface: {
      canvas: '#f8fafc', // slate-50 — console content background
      panel: '#ffffff', // white — console cards
      panelMuted: '#f1f5f9', // slate-100 — hover / inputs
      elevated: '#f8fafc',
    },
    text: {
      primary: '#0f172a', // slate-900
      secondary: '#475569', // slate-600
      muted: '#94a3b8', // slate-400
    },
    border: {
      subtle: 'rgba(15, 23, 42, 0.06)',
      default: '#e2e8f0', // slate-200 — console card borders
      strong: '#cbd5e1', // slate-300
    },
  },
  dark: {
    surface: {
      canvas: '#121212', // console content background
      panel: '#252525', // console cards
      panelMuted: '#1e1e1e', // console sidebar / inputs
      elevated: '#2e2e2e',
    },
    text: {
      primary: '#f8fafc', // slate-50
      secondary: '#cbd5e1', // slate-300
      muted: '#94a3b8', // slate-400
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      default: 'rgba(255, 255, 255, 0.12)',
      strong: 'rgba(255, 255, 255, 0.2)',
    },
  },
};

export function createConsoleCommerceThemeStyle(
  isDark: boolean,
  themeColor: ThemeColorPreference = 'lobster',
): SdkCommerceThemeStyle {
  const sdkThemeColor = mapConsoleThemeColor(themeColor);
  const theme = createSdkworkTheme({
    colorMode: isDark ? 'dark' : 'light',
    themeColor: sdkThemeColor,
    ...CONSOLE_COMMERCE_SURFACE_OVERRIDES[isDark ? 'dark' : 'light'],
  });

  return createThemeHostCssVariables(theme, sdkThemeColor) as SdkCommerceThemeStyle;
}

export function applySdkCommerceThemeVariables(
  isDark: boolean,
  themeColor: ThemeColorPreference = 'lobster',
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const style = createConsoleCommerceThemeStyle(isDark, themeColor);
  const root = document.documentElement;

  for (const key of SDK_COMMERCE_THEME_VAR_KEYS) {
    const value = style[key];
    if (typeof value === 'string' && value.length > 0) {
      root.style.setProperty(key, value);
    }
  }
}

export const CLOUD_ROUTER_COMMERCE_ACTION_CLASS =
  'inline-flex h-9 items-center gap-2 rounded-[1rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-3 text-sm font-medium text-[var(--sdk-color-text-primary)] transition-colors hover:bg-[var(--sdk-color-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sdk-color-border-focus)]';

export const CLOUD_ROUTER_COMMERCE_LINK_CLASS =
  'inline-flex items-center gap-1.5 text-sm font-medium text-[var(--sdk-color-brand-primary)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)]';
