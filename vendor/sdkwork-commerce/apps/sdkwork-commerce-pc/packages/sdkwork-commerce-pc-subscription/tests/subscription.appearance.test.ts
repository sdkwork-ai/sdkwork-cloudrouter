import { describe, expect, it } from "vitest";
import {
  createSdkworkSubscriptionBackdropStyle,
  createSdkworkSubscriptionGlassStyle,
  createSdkworkSubscriptionHeroStyle,
  createSdkworkSubscriptionHeroTextStyle,
  createSdkworkSubscriptionPanelStyle,
  createSdkworkSubscriptionToneStyle,
} from "../src";

describe("sdkwork-commerce-pc-subscription appearance", () => {
  it("creates theme-driven tone styles for reusable premium chips and icon treatments", () => {
    expect(
      createSdkworkSubscriptionToneStyle("brand", {
        backgroundWeight: 18,
        borderWeight: 32,
      }),
    ).toEqual({
      backgroundColor: "color-mix(in srgb, var(--sdk-color-brand-primary) 18%, transparent)",
      borderColor: "color-mix(in srgb, var(--sdk-color-brand-primary) 32%, transparent)",
      color: "var(--sdk-color-brand-primary)",
    });
    expect(createSdkworkSubscriptionGlassStyle("accent").backgroundColor).toBe(
      "color-mix(in srgb, var(--sdk-color-surface-panel) 18%, transparent)",
    );
    expect(createSdkworkSubscriptionHeroTextStyle("muted")).toEqual({
      color: "color-mix(in srgb, white 72%, var(--sdk-color-brand-accent))",
    });
  });

  it("creates layered Sdkwork-style surface gradients for subscription panels and hero canvases", () => {
    expect(createSdkworkSubscriptionPanelStyle("accent").backgroundImage).toContain(
      "var(--sdk-color-brand-accent)",
    );
    expect(createSdkworkSubscriptionPanelStyle("accent").backgroundImage).toContain(
      "var(--sdk-color-surface-panel)",
    );
    expect(createSdkworkSubscriptionBackdropStyle().backgroundImage).toContain(
      "var(--sdk-color-brand-primary)",
    );
    expect(createSdkworkSubscriptionBackdropStyle().backgroundImage).toContain(
      "var(--sdk-color-brand-accent)",
    );
    expect(createSdkworkSubscriptionHeroStyle().backgroundImage).toContain(
      "var(--sdk-color-brand-accent)",
    );
    expect(createSdkworkSubscriptionHeroStyle().backgroundImage).toContain(
      "var(--sdk-color-surface-canvas)",
    );
    expect(createSdkworkSubscriptionHeroStyle().backgroundImage).toContain(
      "var(--sdk-color-surface-panel)",
    );
    expect(createSdkworkSubscriptionHeroStyle().backgroundImage).not.toContain("#111827");
  });
});
