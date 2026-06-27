import type { CSSProperties } from "react";
import { createSdkworkBackdropStyle, createSdkworkGlassStyle, createSdkworkHeroStyle, createSdkworkPanelStyle, createSdkworkToneStyle, type SdkworkThemeVisualTone } from "@sdkwork/ui-pc-react/theme";

export type SdkworkCommerceVisualTone = SdkworkThemeVisualTone;

export function createSdkworkCommerceToneStyle(
  tone: SdkworkCommerceVisualTone,
  options: {
    backgroundWeight?: number;
    borderWeight?: number;
  } = {},
): CSSProperties {
  return createSdkworkToneStyle(tone, options);
}

export function createSdkworkCommercePanelStyle(
  tone: SdkworkCommerceVisualTone,
  options: {
    backgroundWeight?: number;
    borderWeight?: number;
    surfaceColor?: string;
    surfaceWeight?: number;
  } = {},
): CSSProperties {
  return createSdkworkPanelStyle(tone, options);
}

export function createSdkworkCommerceGlassStyle(
  tone: SdkworkCommerceVisualTone,
  options: {
    backgroundWeight?: number;
    borderWeight?: number;
    surfaceColor?: string;
    surfaceWeight?: number;
  } = {},
): CSSProperties {
  return createSdkworkGlassStyle(tone, options);
}

export function createSdkworkCommerceBackdropStyle(): CSSProperties {
  return createSdkworkBackdropStyle();
}

export function createSdkworkCommerceHeroStyle(): CSSProperties {
  return createSdkworkHeroStyle();
}

export function createSdkworkCommerceHeroTextStyle(
  tone: "muted" | "primary" | "subtle" = "primary",
): CSSProperties {
  if (tone === "muted") {
    return {
      color: "color-mix(in srgb, white 72%, var(--sdk-color-brand-accent))",
    };
  }

  if (tone === "subtle") {
    return {
      color: "color-mix(in srgb, white 64%, var(--sdk-color-brand-accent))",
    };
  }

  return {
    color: "color-mix(in srgb, white 92%, var(--sdk-color-brand-accent))",
  };
}

export function createSdkworkCommerceRevenueLineStyle(): CSSProperties {
  return {
    color: "var(--sdk-color-brand-primary)",
  };
}

export function createSdkworkCommerceRevenueBarStyle(): CSSProperties {
  return {
    backgroundImage: "linear-gradient(90deg, color-mix(in srgb, var(--sdk-color-brand-primary) 92%, transparent), color-mix(in srgb, var(--sdk-color-brand-accent) 84%, transparent))",
  };
}
