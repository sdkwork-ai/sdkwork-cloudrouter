import { describe, expect, it } from "vitest";
import {
  createSdkworkMembershipBackdropStyle,
  createSdkworkMembershipGlassStyle,
  createSdkworkMembershipHeroStyle,
  createSdkworkMembershipHeroTextStyle,
  createSdkworkMembershipPanelStyle,
  createSdkworkMembershipToneStyle,
} from "../src";

describe("sdkwork-commerce-pc-membership appearance", () => {
  it("exports theme-driven tone styles for reusable membership chips and icon treatments", () => {
    const createToneStyle = createSdkworkMembershipToneStyle;
    const createGlassStyle = createSdkworkMembershipGlassStyle;
    const createHeroTextStyle = createSdkworkMembershipHeroTextStyle;

    expect(createToneStyle).toBeTypeOf("function");
    expect(createGlassStyle).toBeTypeOf("function");
    expect(createHeroTextStyle).toBeTypeOf("function");

    if (
      typeof createToneStyle !== "function"
      || typeof createGlassStyle !== "function"
      || typeof createHeroTextStyle !== "function"
    ) {
      return;
    }

    expect(
      createToneStyle("accent", {
        backgroundWeight: 18,
        borderWeight: 32,
      }),
    ).toEqual({
      backgroundColor: "color-mix(in srgb, var(--sdk-color-brand-accent) 18%, transparent)",
      borderColor: "color-mix(in srgb, var(--sdk-color-brand-accent) 32%, transparent)",
      color: "var(--sdk-color-brand-accent)",
    });
    expect(createGlassStyle("accent").backgroundColor).toBe(
      "color-mix(in srgb, var(--sdk-color-surface-panel) 18%, transparent)",
    );
    expect(createGlassStyle("accent").backgroundImage).toContain("var(--sdk-color-brand-accent)");
    expect(createGlassStyle("accent").backgroundImage).toContain("var(--sdk-color-surface-panel)");
    expect(createHeroTextStyle("muted")).toEqual({
      color: "color-mix(in srgb, white 72%, var(--sdk-color-brand-accent))",
    });
  });

  it("exports layered Sdkwork-style membership gradients for hero and panel surfaces", () => {
    const createPanelStyle = createSdkworkMembershipPanelStyle;
    const createHeroStyle = createSdkworkMembershipHeroStyle;
    const createBackdropStyle = createSdkworkMembershipBackdropStyle;

    expect(createPanelStyle).toBeTypeOf("function");
    expect(createHeroStyle).toBeTypeOf("function");
    expect(createBackdropStyle).toBeTypeOf("function");

    if (
      typeof createPanelStyle !== "function"
      || typeof createHeroStyle !== "function"
      || typeof createBackdropStyle !== "function"
    ) {
      return;
    }

    expect(createPanelStyle("accent").backgroundImage).toContain("var(--sdk-color-brand-accent)");
    expect(createPanelStyle("accent").backgroundImage).toContain("var(--sdk-color-surface-panel)");
    expect(createHeroStyle().backgroundImage).toContain("var(--sdk-color-brand-primary)");
    expect(createHeroStyle().backgroundImage).toContain("var(--sdk-color-surface-canvas)");
    expect(createHeroStyle().backgroundImage).toContain("var(--sdk-color-surface-panel)");
    expect(createHeroStyle().backgroundImage).toContain("var(--sdk-color-surface-elevated)");
    expect(createHeroStyle().backgroundImage).not.toContain("#18181b");
    expect(createBackdropStyle().backgroundImage).toContain("var(--sdk-color-brand-primary)");
    expect(createBackdropStyle().backgroundImage).toContain("var(--sdk-color-brand-accent)");
  });
});
