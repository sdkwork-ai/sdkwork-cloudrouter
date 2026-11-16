import { describe, expect, it } from "vitest";

import {
  createEmptyTemplateDraft,
  DEPLOY_TEMPLATE_KEY_PATTERN,
  DEPLOY_TEMPLATE_VERSION_PATTERN,
  parseScreenshots,
  toTemplateCreateInput,
  toTemplateUpdateInput,
  validateTemplateDraft,
  validateVersionInput,
} from "../src/services/deploy-template-form";

function validDraft() {
  return {
    ...createEmptyTemplateDraft("cat-1"),
    appUuid: "app-1",
    templateKey: "demo-template",
    displayName: "Demo",
    summary: "One line",
  };
}

describe("deploy template form", () => {
  it("accepts a complete free draft", () => {
    expect(validateTemplateDraft(validDraft(), false)).toEqual([]);
  });

  it("requires the identity fields on create only", () => {
    const issues = validateTemplateDraft(
      { ...createEmptyTemplateDraft(), displayName: "", summary: "" },
      false,
    );
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "app-required",
        "category-required",
        "template-key-required",
        "display-name-required",
        "summary-required",
      ]),
    );
    const editIssues = validateTemplateDraft(
      { ...validDraft(), appUuid: "", templateKey: "" },
      true,
    );
    expect(editIssues).toEqual([]);
  });

  it("rejects malformed keys and paid listings without price", () => {
    const issues = validateTemplateDraft(
      {
        ...validDraft(),
        templateKey: "Demo Key",
        pricingModel: "PAID",
        priceMinor: "0",
        currency: "YE",
      },
      false,
    );
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["template-key-invalid", "price-invalid", "currency-invalid"]),
    );
  });

  it("builds create and update payloads without blank paid fields when free", () => {
    const createInput = toTemplateCreateInput({
      ...validDraft(),
      pricingModel: "FREE",
      priceMinor: "9900",
      currency: "CNY",
    });
    expect(createInput).not.toHaveProperty("priceMinor");
    expect(createInput).not.toHaveProperty("currency");
    expect(createInput.templateKey).toBe("demo-template");

    const updateInput = toTemplateUpdateInput({
      ...validDraft(),
      pricingModel: "PAID",
      priceMinor: "9900",
      currency: "cny",
    });
    expect(updateInput).toMatchObject({ priceMinor: "9900", currency: "CNY" });
  });

  it("validates semantic versions", () => {
    expect(validateVersionInput({ version: "1.2.0" })).toEqual([]);
    expect(validateVersionInput({ version: "" })[0]?.code).toBe("version-required");
    expect(validateVersionInput({ version: "v1" })[0]?.code).toBe("version-invalid");
    expect(validateVersionInput({ version: "1.2.0", changelog: "x".repeat(2001) })[0]?.code)
      .toBe("changelog-too-long");
  });

  it("publishes the documented key and version patterns", () => {
    expect(DEPLOY_TEMPLATE_KEY_PATTERN.test("demo-template")).toBe(true);
    expect(DEPLOY_TEMPLATE_KEY_PATTERN.test("Demo")).toBe(false);
    expect(DEPLOY_TEMPLATE_VERSION_PATTERN.test("1.2.0")).toBe(true);
    expect(DEPLOY_TEMPLATE_VERSION_PATTERN.test("1.2")).toBe(false);
  });

  it("parses screenshot lines and includes them in write payloads", () => {
    const draft = {
      ...validDraft(),
      screenshotsText: "drive://media/shot-1 | desktop | Home\n\n drive://media/shot-2 | mobile ",
    };
    expect(parseScreenshots(draft.screenshotsText)).toEqual([
      { mediaRef: "drive://media/shot-1", device: "desktop", caption: "Home", sortOrder: 0 },
      { mediaRef: "drive://media/shot-2", device: "mobile", sortOrder: 1 },
    ]);
    expect(toTemplateCreateInput(draft).screenshots).toHaveLength(2);
    expect(toTemplateUpdateInput(draft).screenshots).toHaveLength(2);

    const cleared = toTemplateUpdateInput({ ...validDraft(), screenshotsText: "" });
    expect(cleared.screenshots).toEqual([]);
  });
});
