import { describe, expect, it } from "vitest";

import { planCategoryImport } from "../src/services/category-import";

const document = {
  schemaVersion: 1,
  exportedAt: "2026-01-02T00:00:00.000Z",
  kind: "appstore-categories",
  categories: [
    {
      code: "ai",
      name: "AI",
      parentCode: null,
      sortOrder: 20,
      children: [
        { code: "ai-tools", name: "AI Tools", parentCode: "ai", sortOrder: 10, children: [] },
      ],
    },
    { code: "games", name: "Games", parentCode: null, sortOrder: 10, children: [] },
  ],
};

describe("category import planning", () => {
  it("flattens parents before children and keeps localized names", () => {
    const plan = planCategoryImport(document, "appstore-categories");
    expect(plan.errors).toEqual([]);
    expect(plan.items.map((item) => item.code)).toEqual(["games", "ai", "ai-tools"]);
    expect(plan.items[1]).toMatchObject({ code: "ai", depth: 1 });
    expect(plan.items[1]?.parentCode).toBeUndefined();
    expect(plan.items[1]?.status).toBeUndefined();
    expect(plan.items[2]).toMatchObject({ code: "ai-tools", depth: 2, parentCode: "ai" });
    expect(plan.items[1]?.localizations).toEqual([{ locale: "zh-CN", displayName: "AI" }]);
  });

  it("rejects duplicate and existing codes before writing", () => {
    const plan = planCategoryImport({
      ...document,
      categories: [
        { code: "ai", name: "AI", sortOrder: 0, children: [] },
        { code: "AI", name: "AI duplicate", sortOrder: 0, children: [] },
      ],
    }, "appstore-categories", ["games"]);
    expect(plan.errors).toContain("duplicate-code");
    const existing = planCategoryImport({
      ...document,
      categories: [{ code: "games", name: "Games", sortOrder: 0, children: [] }],
    }, "appstore-categories", ["games"]);
    expect(existing.errors).toContain("existing-code");
  });

  it("rejects documents beyond five levels and wrong kinds", () => {
    const deep = {
      ...document,
      categories: [{
        code: "l1", name: "L1", children: [{
          code: "l2", name: "L2", children: [{
            code: "l3", name: "L3", children: [{
              code: "l4", name: "L4", children: [{
                code: "l5", name: "L5", children: [{ code: "l6", name: "L6", children: [] }],
              }],
            }],
          }],
        }],
      }],
    };
    expect(planCategoryImport(deep, "appstore-categories").errors).toContain("depth-exceeded");
    expect(planCategoryImport(document, "template-categories").errors).toContain("invalid-document");
  });
});
