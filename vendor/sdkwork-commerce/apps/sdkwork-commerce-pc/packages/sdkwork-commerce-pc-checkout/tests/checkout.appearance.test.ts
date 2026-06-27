import { describe, expect, it } from "vitest";
import {
  createSdkworkCheckoutBackdropStyle,
  createSdkworkCheckoutGlassStyle,
  createSdkworkCheckoutHeroStyle,
  createSdkworkCheckoutHeroTextStyle,
  createSdkworkCheckoutPanelStyle,
  createSdkworkCheckoutToneStyle,
} from "../src";

describe("sdkwork-commerce-pc-checkout appearance", () => {
  it("exports Sdkwork-style checkout backdrop, hero, panel, and tone helpers", () => {
    expect(createSdkworkCheckoutToneStyle("brand").color).toBe("var(--sdk-color-brand-primary)");
    expect(createSdkworkCheckoutPanelStyle("accent").backgroundImage).toContain("var(--sdk-color-brand-accent)");
    expect(createSdkworkCheckoutPanelStyle("accent").backgroundImage).toContain("var(--sdk-color-surface-panel)");
    expect(createSdkworkCheckoutGlassStyle("brand").backgroundImage).toContain("var(--sdk-color-surface-panel)");
    expect(createSdkworkCheckoutHeroStyle().backgroundImage).toContain("var(--sdk-color-brand-accent)");
    expect(createSdkworkCheckoutHeroStyle().backgroundImage).toContain("var(--sdk-color-surface-canvas)");
    expect(createSdkworkCheckoutHeroStyle().backgroundImage).toContain("var(--sdk-color-surface-panel)");
    expect(createSdkworkCheckoutHeroStyle().backgroundImage).toContain("var(--sdk-color-surface-elevated)");
    expect(createSdkworkCheckoutHeroStyle().backgroundImage).not.toContain("#18181b");
    expect(createSdkworkCheckoutHeroTextStyle("muted")).toEqual({
      color: "color-mix(in srgb, white 72%, var(--sdk-color-brand-accent))",
    });
    expect(createSdkworkCheckoutBackdropStyle().backgroundImage).toContain("var(--sdk-color-brand-primary)");
  });
});
