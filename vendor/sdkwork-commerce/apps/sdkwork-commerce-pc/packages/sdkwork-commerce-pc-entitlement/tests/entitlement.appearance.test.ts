import { describe, expect, it } from "vitest";
import {
  createSdkworkEntitlementBackdropStyle,
  createSdkworkEntitlementGlassStyle,
  createSdkworkEntitlementHeroStyle,
  createSdkworkEntitlementHeroTextStyle,
  createSdkworkEntitlementPanelStyle,
  createSdkworkEntitlementToneStyle,
} from "../src";

describe("sdkwork-commerce-pc-entitlement appearance", () => {
  it("exports sdkwork-style entitlement backdrop, hero, panel, tone, glass, and hero-text helpers", () => {
    const createToneStyle = createSdkworkEntitlementToneStyle;
    const createPanelStyle = createSdkworkEntitlementPanelStyle;
    const createHeroStyle = createSdkworkEntitlementHeroStyle;
    const createBackdropStyle = createSdkworkEntitlementBackdropStyle;
    const createGlassStyle = createSdkworkEntitlementGlassStyle;
    const createHeroTextStyle = createSdkworkEntitlementHeroTextStyle;

    expect(createToneStyle).toBeTypeOf("function");
    expect(createPanelStyle).toBeTypeOf("function");
    expect(createHeroStyle).toBeTypeOf("function");
    expect(createBackdropStyle).toBeTypeOf("function");
    expect(createGlassStyle).toBeTypeOf("function");
    expect(createHeroTextStyle).toBeTypeOf("function");

    if (
      typeof createToneStyle !== "function"
      || typeof createPanelStyle !== "function"
      || typeof createHeroStyle !== "function"
      || typeof createBackdropStyle !== "function"
      || typeof createGlassStyle !== "function"
      || typeof createHeroTextStyle !== "function"
    ) {
      return;
    }

    expect(createToneStyle("warning").color).toBe("var(--sdk-color-state-warning)");
    expect(createPanelStyle("accent").backgroundImage).toContain("var(--sdk-color-brand-accent)");
    expect(createHeroStyle().backgroundImage).toContain("var(--sdk-color-surface-canvas)");
    expect(createHeroStyle().backgroundImage).toContain("var(--sdk-color-surface-panel)");
    expect(createHeroStyle().backgroundImage).not.toContain("#111827");
    expect(createBackdropStyle().backgroundImage).toContain("var(--sdk-color-brand-primary)");
    expect(createGlassStyle("danger").backgroundImage).toContain("var(--sdk-color-state-danger)");
    expect(String(createHeroTextStyle("muted").color)).toContain("white");
  });
});
