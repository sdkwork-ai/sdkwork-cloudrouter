import type { CSSProperties } from 'react';
import {
  createSdkworkTheme,
  createThemeHostCssVariables,
  type SdkworkThemeColor,
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

export function createConsoleCommerceThemeStyle(
  isDark: boolean,
  themeColor: ThemeColorPreference = 'lobster',
): SdkCommerceThemeStyle {
  const sdkThemeColor = mapConsoleThemeColor(themeColor);
  const theme = createSdkworkTheme({
    colorMode: isDark ? 'dark' : 'light',
    themeColor: sdkThemeColor,
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

export const CLAW_ROUTER_COMMERCE_ACTION_CLASS =
  'inline-flex h-9 items-center gap-2 rounded-[1rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-3 text-sm font-medium text-[var(--sdk-color-text-primary)] transition-colors hover:bg-[var(--sdk-color-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sdk-color-border-focus)]';

export const CLAW_ROUTER_COMMERCE_LINK_CLASS =
  'inline-flex items-center gap-1.5 text-sm font-medium text-[var(--sdk-color-brand-primary)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)]';
