import assert from "node:assert/strict";
import { test } from "node:test";

import { resources } from "./packages/sdkwork-cloudrouter-pc-i18n/src/resources/index.ts";

const en = resources.en.translation;
const zh = resources.zh.translation;

const ENTERPRISE_KEYS = [
  "admin.header.enterpriseCenter",
  "admin.menu.enterprise.overview",
  "admin.menu.enterprise.companies",
  "admin.menu.enterprise.onboarding",
  "admin.menu.enterprise.introductions",
  "admin.menu.enterprise.classifications",
  "admin.menu.enterprise.industries",
  "admin.menu.enterprise.jobs",
  "admin.menu.enterprise.applications",
  "admin.enterprise.overview.title",
  "admin.enterprise.companies.title",
  "admin.enterprise.onboarding.title",
  "admin.enterprise.classifications.title",
  "admin.enterprise.industries.title",
  "admin.enterprise.recruitment.title",
  "admin.enterprise.applications.title",
  "admin.enterprise.profile.title",
  "admin.siteSettings.adminModules.items.enterpriseCenter.label",
  "admin.siteSettings.adminModules.items.enterpriseCenter.description",
];

test("merged i18n resources carry every enterprise center key in en and zh", () => {
  for (const key of ENTERPRISE_KEYS) {
    assert.ok(en[key], `missing en key: ${key}`);
    assert.ok(zh[key], `missing zh key: ${key}`);
  }
  assert.equal(en["admin.header.enterpriseCenter"], "Enterprise Center");
  assert.equal(zh["admin.header.enterpriseCenter"], "企业中心");
  assert.equal(zh["admin.menu.enterprise.companies"], "公司管理");
  assert.equal(en["admin.menu.enterprise.companies"], "Companies");
});
