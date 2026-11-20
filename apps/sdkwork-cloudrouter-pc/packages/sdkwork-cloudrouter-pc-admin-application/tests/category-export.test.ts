import { describe, expect, it } from "vitest";

import {
  buildAppStoreCategoryExport,
  buildCategoryExportTree,
  buildScaffoldCategoryExport,
} from "../src/services/category-export";
import type { AppStoreCategory } from "../src/types/appstore-categories";

describe("category export", () => {
  it("builds a sorted nested tree with parent codes", () => {
    const roots = buildCategoryExportTree([
      { id: "b", code: "b", name: "B", status: "active", sortOrder: 20 },
      { id: "a", code: "a", name: "A", status: "active", sortOrder: 10 },
      { id: "a1", parentId: "a", code: "a1", name: "A1", status: "inactive", sortOrder: 5 },
      { id: "a2", parentId: "a", code: "a2", name: "A2", status: "active", sortOrder: 10 },
    ]);

    expect(roots.map((node) => node.code)).toEqual(["a", "b"]);
    expect(roots[0]?.children.map((node) => node.code)).toEqual(["a1", "a2"]);
    expect(roots[0]?.children[0]?.parentCode).toBe("a");
  });

  it("exports localized App Store names and localizations", () => {
    const category: AppStoreCategory = {
      id: "cat-1",
      code: "ai",
      level: 1,
      sortOrder: 10,
      status: "active",
      localizations: [{ locale: "ja-JP", displayName: "AI アシスタント" }],
    };
    const document = buildAppStoreCategoryExport(
      [category],
      (item) => item.localizations[0]?.displayName ?? item.code,
      new Date("2026-01-02T00:00:00.000Z"),
    );

    expect(document.kind).toBe("appstore-categories");
    expect(document.exportedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(document.categories[0]).toMatchObject({
      code: "ai",
      name: "AI アシスタント",
      level: 1,
      localizations: [{ locale: "ja-JP", displayName: "AI アシスタント" }],
    });
  });

  it("exports scaffold categories with stable keys", () => {
    const document = buildScaffoldCategoryExport([
      {
        id: "tpl-cat-1",
        categoryKey: "games",
        displayName: "Games",
        sortOrder: 10,
        status: "ACTIVE",
      },
    ], new Date("2026-01-02T00:00:00.000Z"));

    expect(document.kind).toBe("scaffold-categories");
    expect(document.categories[0]).toMatchObject({ code: "games", name: "Games" });
  });
});
