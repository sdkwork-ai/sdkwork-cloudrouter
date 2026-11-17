import { describe, expect, it } from "vitest";

import {
  APPLICATION_CENTER_ACTION_PERMISSIONS,
  APPLICATION_CENTER_MODULE_PERMISSION,
  applicationCenterPermissionFor,
  isApplicationCenterActionAllowed,
  type ApplicationCenterAction,
} from "../src/permissions/application-center-actions";

describe("App Center action permissions", () => {
  it("maps template actions to the Deploy permission codes the route manifest enforces", () => {
    expect(applicationCenterPermissionFor("templateReview")).toBe("deploy.appTemplates.write");
    expect(applicationCenterPermissionFor("templateWrite")).toBe("deploy.appTemplates.write");
    expect(applicationCenterPermissionFor("templateCategoryWrite")).toBe("deploy.templateCategories.write");
  });

  it("keeps the module gate for App Store actions without a finer IAM code", () => {
    const actions = Object.keys(APPLICATION_CENTER_ACTION_PERMISSIONS) as ApplicationCenterAction[];
    expect(actions.length).toBeGreaterThan(5);
    for (const action of actions) {
      const code = applicationCenterPermissionFor(action);
      expect(code === APPLICATION_CENTER_MODULE_PERMISSION || code.startsWith("deploy.")).toBe(true);
    }
    expect(applicationCenterPermissionFor("moderationDecide")).toBe(APPLICATION_CENTER_MODULE_PERMISSION);
  });

  it("maps the remix source surface to the deploy app codes", () => {
    expect(applicationCenterPermissionFor("sourceRead")).toBe("deploy.apps.read");
    expect(applicationCenterPermissionFor("sourceWrite")).toBe("deploy.apps.write");
    expect(isApplicationCenterActionAllowed("sourceRead", ["deploy.apps.read"])).toBe(true);
    expect(isApplicationCenterActionAllowed("sourceWrite", ["deploy.apps.read"])).toBe(false);
    expect(isApplicationCenterActionAllowed("sourceWrite", ["deploy.apps.write"])).toBe(true);
  });

  it("gates template actions on the deploy grant or the module gate", () => {
    expect(isApplicationCenterActionAllowed("templateReview", ["deploy.appTemplates.write"])).toBe(true);
    expect(isApplicationCenterActionAllowed("templateCategoryWrite", ["deploy.templateCategories.write"])).toBe(true);
    // The console session scope carries only cloudrouter.* codes today, so the
    // module gate keeps an authorized operator on the surface.
    expect(isApplicationCenterActionAllowed("templateReview", ["cloudrouter.admin.access"])).toBe(true);
    expect(isApplicationCenterActionAllowed("templateWrite", ["*"])).toBe(true);
    expect(isApplicationCenterActionAllowed("templateCategoryWrite", ["deploy.*"])).toBe(true);
  });

  it("denies actions when the scope carries neither grant", () => {
    expect(isApplicationCenterActionAllowed("templateReview", ["cloudrouter.system.read"])).toBe(false);
    expect(isApplicationCenterActionAllowed("templateCategoryWrite", ["deploy.marketplaceTemplates.read"])).toBe(false);
    expect(isApplicationCenterActionAllowed("moderationDecide", [])).toBe(false);
  });
});
