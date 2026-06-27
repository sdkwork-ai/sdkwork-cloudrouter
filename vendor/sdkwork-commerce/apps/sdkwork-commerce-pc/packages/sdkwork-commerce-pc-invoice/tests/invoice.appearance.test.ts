import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createSdkworkInvoiceBackdropStyle,
  createSdkworkInvoiceGlassStyle,
  createSdkworkInvoiceHeroStyle,
  createSdkworkInvoiceHeroTextStyle,
  createSdkworkInvoicePanelStyle,
  createSdkworkInvoiceToneStyle,
} from "../src";

describe("sdkwork-commerce-pc-invoice appearance", () => {
  it("exposes invoice appearance seam from package index", () => {
    const indexFile = readFileSync(
      resolve(import.meta.dirname, "../src/index.ts"),
      "utf8",
    );

    expect(indexFile).toMatch(/export \* from "\.\/invoice-appearance(?:\.ts)?";/);
  });

  it("exports shared tone, glass, panel, backdrop, and hero helpers", () => {
    expect(createSdkworkInvoiceToneStyle("warning")).toEqual({
      backgroundColor: "color-mix(in srgb, var(--sdk-color-state-warning) 14%, transparent)",
      borderColor: "color-mix(in srgb, var(--sdk-color-state-warning) 28%, transparent)",
      color: "var(--sdk-color-state-warning)",
    });
    expect(createSdkworkInvoiceBackdropStyle().backgroundImage).toContain("var(--sdk-color-brand-primary)");
    expect(createSdkworkInvoiceGlassStyle("brand").backgroundImage).toContain("var(--sdk-color-brand-primary)");
    expect(createSdkworkInvoicePanelStyle("accent").backgroundImage).toContain("var(--sdk-color-brand-accent)");
    expect(createSdkworkInvoiceHeroStyle().backgroundImage).toContain("linear-gradient");
    expect(createSdkworkInvoiceHeroStyle().backgroundImage).toContain("var(--sdk-color-brand-accent)");
    expect(createSdkworkInvoiceHeroStyle().backgroundImage).not.toContain("#111827");
    expect(createSdkworkInvoiceHeroTextStyle("muted")).toEqual({
      color: "color-mix(in srgb, white 72%, var(--sdk-color-brand-accent))",
    });
  });
});
