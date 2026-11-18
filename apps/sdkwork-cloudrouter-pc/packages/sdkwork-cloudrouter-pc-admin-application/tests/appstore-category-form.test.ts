import { describe, expect, it } from "vitest";

import {
  addCategoryDraftLocale,
  APP_STORE_CATEGORY_CODE_PATTERN,
  createCategoryDraft,
  createEmptyCategoryDraft,
  isDescendantOrSelf,
  listEligibleParents,
  removeCategoryDraftLocale,
  resolveDraftLevel,
  sortCategories,
  toCategoryCreateInput,
  toCategoryUpdateInput,
  validateCategoryDraft,
} from "../src/services/appstore-category-form";
import type { AppStoreCategory } from "../src/types/appstore-categories";

/**
 * Category draft regression.
 *
 * These cases are the mistakes the backend either rejects (bad status, missing
 * code) or silently ignores (a duplicate code, a level that contradicts the
 * parent, an emptied translation). The form must catch them before dispatch.
 */

function category(overrides: Partial<AppStoreCategory> & Pick<AppStoreCategory, "id" | "code">): AppStoreCategory {
  return {
    id: overrides.id,
    code: overrides.code,
    level: overrides.level ?? 1,
    sortOrder: overrides.sortOrder ?? 10,
    status: overrides.status ?? "active",
    localizations: overrides.localizations ?? [{ locale: "zh-CN", displayName: overrides.code }],
    ...overrides,
  };
}

const rootCategory = category({
  id: "cat-root",
  code: "ai-assistants",
  localizations: [{ locale: "zh-CN", displayName: "AI 助手" }],
});

const childCategory = category({
  id: "cat-child",
  code: "ai-coding",
  parentId: "cat-root",
  level: 2,
  localizations: [{ locale: "zh-CN", displayName: "AI 编程" }],
});

const grandChildCategory = category({
  id: "cat-grandchild",
  code: "ai-coding-agent",
  parentId: "cat-child",
  level: 3,
  localizations: [{ locale: "zh-CN", displayName: "AI 编程 Agent" }],
});

describe("app store category draft validation", () => {
  it("adds optional locales and only removes unsaved slots", () => {
    const draft = createEmptyCategoryDraft();
    const withJapanese = addCategoryDraftLocale(draft, "ja-JP");
    expect(withJapanese.localizations.some((entry) => entry.locale === "ja-JP")).toBe(true);
    expect(addCategoryDraftLocale(withJapanese, "ja-JP")).toBe(withJapanese);

    const removed = removeCategoryDraftLocale(withJapanese, "ja-JP");
    expect(removed.localizations.some((entry) => entry.locale === "ja-JP")).toBe(false);
    expect(removeCategoryDraftLocale(withJapanese, "zh-CN")).toBe(withJapanese);

    const editing = createCategoryDraft({
      ...rootCategory,
      localizations: [
        ...rootCategory.localizations,
        { locale: "ja-JP", displayName: "AI アシスタント" },
      ],
    });
    expect(editing.localizations.some((entry) => entry.locale === "ja-JP")).toBe(true);
    expect(removeCategoryDraftLocale(editing, "ja-JP")).toBe(editing);
  });

  it("caps the taxonomy at five levels", () => {
    const levelFive = category({ id: "cat-l5", code: "level-five", level: 5 });
    const draft = {
      ...createEmptyCategoryDraft(),
      code: "level-six",
      parentId: "cat-l5",
      level: "6",
      localizations: createEmptyCategoryDraft().localizations.map((entry) =>
        entry.locale === "zh-CN" ? { ...entry, displayName: "第六级" } : entry),
    };
    expect(validateCategoryDraft(draft, [levelFive]).map((issue) => issue.code))
      .toContain("parent-level-invalid");
    expect(listEligibleParents([levelFive])).toEqual([]);
  });

  it("requires a code and the Simplified Chinese name on a new category", () => {
    const issues = validateCategoryDraft(createEmptyCategoryDraft(), []);
    expect(issues.map((issue) => issue.code)).toEqual(["code-required", "name-required"]);
  });

  it("rejects codes outside the platform pattern and duplicates", () => {
    const invalid = validateCategoryDraft({
      ...createEmptyCategoryDraft(),
      code: "AI Assistants",
      localizations: createEmptyCategoryDraft().localizations.map((entry) =>
        entry.locale === "zh-CN" ? { ...entry, displayName: "AI 助手" } : entry),
    }, []);
    expect(invalid.some((issue) => issue.code === "code-invalid")).toBe(true);

    const duplicate = validateCategoryDraft({
      ...createEmptyCategoryDraft(),
      code: "ai-assistants",
      localizations: createEmptyCategoryDraft().localizations.map((entry) =>
        entry.locale === "zh-CN" ? { ...entry, displayName: "AI 助手" } : entry),
    }, [rootCategory]);
    expect(duplicate.some((issue) => issue.code === "code-duplicate")).toBe(true);
    expect(APP_STORE_CATEGORY_CODE_PATTERN.test("ai-assistants")).toBe(true);
    expect(APP_STORE_CATEGORY_CODE_PATTERN.test("ai_assistants.v2")).toBe(true);
  });

  it("allows editing a category without tripping over its own code", () => {
    const draft = createCategoryDraft(rootCategory);
    expect(validateCategoryDraft(draft, [rootCategory, childCategory], rootCategory.id)).toEqual([]);
  });

  it("rejects a parent that is the category itself or one of its descendants", () => {
    const selfDraft = { ...createCategoryDraft(rootCategory), parentId: "cat-root", level: "2" };
    expect(validateCategoryDraft(selfDraft, [rootCategory, childCategory], rootCategory.id))
      .toContainEqual({ field: "parent", code: "parent-cycle" });

    const descendantDraft = { ...createCategoryDraft(rootCategory), parentId: "cat-grandchild", level: "2" };
    expect(validateCategoryDraft(descendantDraft, [rootCategory, childCategory, grandChildCategory], rootCategory.id))
      .toContainEqual({ field: "parent", code: "parent-cycle" });
  });

  it("derives the level from the parent and flags a contradiction", () => {
    expect(resolveDraftLevel("cat-child", [rootCategory, childCategory])).toBe(3);
    const draft = { ...createCategoryDraft(rootCategory), parentId: "cat-child", level: "1" };
    expect(validateCategoryDraft(draft, [rootCategory, childCategory], rootCategory.id))
      .toContainEqual({ field: "parent", code: "parent-cycle" });
  });

  it("does not let an existing translation be silently emptied", () => {
    const draft = createCategoryDraft(rootCategory);
    const emptied = {
      ...draft,
      localizations: draft.localizations.map((entry) =>
        entry.locale === "zh-CN" ? { ...entry, displayName: "  " } : entry),
    };
    expect(validateCategoryDraft(emptied, [rootCategory], rootCategory.id))
      .toContainEqual({ field: "locale", code: "name-required", locale: "zh-CN" });
  });

  it("rejects an out-of-range sort order", () => {
    const draft = {
      ...createEmptyCategoryDraft(),
      code: "games",
      sortOrder: "10.5",
      localizations: createEmptyCategoryDraft().localizations.map((entry) =>
        entry.locale === "zh-CN" ? { ...entry, displayName: "游戏" } : entry),
    };
    expect(validateCategoryDraft(draft, [])).toContainEqual({ field: "sortOrder", code: "sort-order-invalid" });
  });
});

describe("app store category draft projection", () => {
  it("builds a create input with only populated locales", () => {
    const draft = {
      ...createEmptyCategoryDraft(30),
      code: "  games  ",
      parentId: "cat-root",
      level: "2",
      iconMediaResourceId: "mr-games",
      localizations: [
        { locale: "zh-CN", displayName: " 游戏 ", description: " 休闲游戏 ", existing: false },
        { locale: "en-US", displayName: "   ", description: "", existing: false },
      ],
    };

    expect(toCategoryCreateInput(draft)).toEqual({
      code: "games",
      parentId: "cat-root",
      level: 2,
      sortOrder: 30,
      iconMediaResourceId: "mr-games",
      localizations: [{ locale: "zh-CN", displayName: "游戏", description: "休闲游戏" }],
    });
  });

  it("omits unchanged status and parent on update", () => {
    const draft = {
      ...createCategoryDraft(childCategory),
      sortOrder: "15",
      localizations: createCategoryDraft(childCategory).localizations.map((entry) =>
        entry.locale === "zh-CN" ? { ...entry, displayName: "AI 编程工具" } : entry),
    };

    expect(toCategoryUpdateInput(draft, childCategory)).toEqual({
      sortOrder: 15,
      localizations: [{ locale: "zh-CN", displayName: "AI 编程工具" }],
    });
  });

  it("sends a status change and a re-parented level", () => {
    const draft = {
      ...createCategoryDraft(rootCategory),
      parentId: "cat-child",
      level: "3",
      status: "inactive" as const,
    };

    expect(toCategoryUpdateInput(draft, rootCategory)).toMatchObject({
      parentId: "cat-child",
      level: 3,
      status: "inactive",
    });
  });

  it("excludes the row and its subtree from parent candidates", () => {
    const candidates = listEligibleParents([rootCategory, childCategory, grandChildCategory], childCategory.id);
    expect(candidates.map((entry) => entry.id)).toEqual(["cat-root"]);
    expect(isDescendantOrSelf("cat-grandchild", "cat-child", [rootCategory, childCategory, grandChildCategory]))
      .toBe(true);
  });

  it("sorts rows by operator sort order then code", () => {
    const rows = sortCategories([
      category({ id: "c", code: "c", sortOrder: 20 }),
      category({ id: "a", code: "a", sortOrder: 20 }),
      category({ id: "b", code: "b", sortOrder: 10 }),
    ], "zh-CN");
    expect(rows.map((entry) => entry.id)).toEqual(["b", "a", "c"]);
  });
});
