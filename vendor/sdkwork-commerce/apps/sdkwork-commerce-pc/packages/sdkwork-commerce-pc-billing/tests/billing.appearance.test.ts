import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createSdkworkBillingBackdropStyle,
  createSdkworkBillingGlassStyle,
  createSdkworkBillingHeroStyle,
  createSdkworkBillingHeroTextStyle,
  createSdkworkBillingPanelStyle,
  createSdkworkBillingToneStyle,
} from "../src";

describe("sdkwork-commerce-pc-billing appearance", () => {
  it("exposes billing appearance seam from package index", () => {
    const indexFile = readFileSync(
      resolve(import.meta.dirname, "../src/index.ts"),
      "utf8",
    );

    expect(indexFile).toMatch(/export \* from "\.\/billing-appearance(?:\.ts)?";/);
  });

  it("exports shared tone, glass, panel, backdrop, and hero style helpers", () => {
    expect(
      createSdkworkBillingToneStyle("accent", {
        backgroundWeight: 18,
        borderWeight: 32,
      }),
    ).toEqual({
      backgroundColor: "color-mix(in srgb, var(--sdk-color-brand-accent) 18%, transparent)",
      borderColor: "color-mix(in srgb, var(--sdk-color-brand-accent) 32%, transparent)",
      color: "var(--sdk-color-brand-accent)",
    });
    expect(createSdkworkBillingGlassStyle("brand").backgroundImage).toContain("var(--sdk-color-brand-primary)");
    expect(createSdkworkBillingPanelStyle("accent").backgroundImage).toContain("var(--sdk-color-brand-accent)");
    expect(createSdkworkBillingPanelStyle("accent").backgroundImage).toContain("var(--sdk-color-surface-panel)");
    expect(createSdkworkBillingHeroStyle().backgroundImage).toContain("var(--sdk-color-brand-primary)");
    expect(createSdkworkBillingHeroStyle().backgroundImage).toContain("var(--sdk-color-surface-canvas)");
    expect(createSdkworkBillingHeroStyle().backgroundImage).not.toContain("#18181b");
    expect(createSdkworkBillingHeroTextStyle("muted")).toEqual({
      color: "color-mix(in srgb, white 72%, var(--sdk-color-brand-accent))",
    });
    expect(createSdkworkBillingBackdropStyle().backgroundImage).toContain("var(--sdk-color-brand-primary)");
    expect(createSdkworkBillingBackdropStyle().backgroundImage).toContain("var(--sdk-color-brand-accent)");
  });
});
