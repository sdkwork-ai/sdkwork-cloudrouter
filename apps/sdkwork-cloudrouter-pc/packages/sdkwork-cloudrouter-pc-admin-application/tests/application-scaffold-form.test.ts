import { describe, expect, it } from "vitest";

import {
  createEmptyScaffoldDraft,
  APPLICATION_SCAFFOLD_KEY_PATTERN,
  APPLICATION_SCAFFOLD_VERSION_PATTERN,
  parseScreenshots,
  toScaffoldCreateInput,
  toScaffoldUpdateInput,
  validateScaffoldDraft,
  validateVersionInput,
} from "../src/services/application-scaffold-form";

function validDraft() {
  return {
    ...createEmptyScaffoldDraft("cat-1"),
    appUuid: "app-1",
    scaffoldKey: "demo-scaffold",
    displayName: "Demo",
    summary: "One line",
  };
}

describe("application scaffold form", () => {
  it("accepts a complete free draft", () => {
    expect(validateScaffoldDraft(validDraft(), false)).toEqual([]);
  });

  it("requires the identity fields on create only", () => {
    const issues = validateScaffoldDraft(
      { ...createEmptyScaffoldDraft(), displayName: "", summary: "" },
      false,
    );
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "app-required",
        "category-required",
        "scaffold-key-required",
        "display-name-required",
        "summary-required",
      ]),
    );
    const editIssues = validateScaffoldDraft(
      { ...validDraft(), appUuid: "", scaffoldKey: "" },
      true,
    );
    expect(editIssues).toEqual([]);
  });

  it("rejects malformed keys and paid listings without price", () => {
    const issues = validateScaffoldDraft(
      {
        ...validDraft(),
        scaffoldKey: "Demo Key",
        pricingModel: "PAID",
        priceMinor: "0",
        currency: "YE",
      },
      false,
    );
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["scaffold-key-invalid", "price-invalid", "currency-invalid"]),
    );
  });

  it("builds create and update payloads without blank paid fields when free", () => {
    const createInput = toScaffoldCreateInput({
      ...validDraft(),
      pricingModel: "FREE",
      priceMinor: "9900",
      currency: "CNY",
    });
    expect(createInput).not.toHaveProperty("priceMinor");
    expect(createInput).not.toHaveProperty("currency");
    expect(createInput.scaffoldKey).toBe("demo-scaffold");

    const updateInput = toScaffoldUpdateInput({
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
    expect(APPLICATION_SCAFFOLD_KEY_PATTERN.test("demo-scaffold")).toBe(true);
    expect(APPLICATION_SCAFFOLD_KEY_PATTERN.test("Demo")).toBe(false);
    expect(APPLICATION_SCAFFOLD_VERSION_PATTERN.test("1.2.0")).toBe(true);
    expect(APPLICATION_SCAFFOLD_VERSION_PATTERN.test("1.2")).toBe(false);
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
    expect(toScaffoldCreateInput(draft).screenshots).toHaveLength(2);
    expect(toScaffoldUpdateInput(draft).screenshots).toHaveLength(2);

    const cleared = toScaffoldUpdateInput({ ...validDraft(), screenshotsText: "" });
    expect(cleared.screenshots).toEqual([]);
  });
});
