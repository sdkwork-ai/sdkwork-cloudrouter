import { describe, expect, it } from "vitest";

import {
  APPLICATION_CENTER_ACTION_PERMISSIONS,
  applicationCenterPermissionFor,
  isApplicationCenterActionAllowed,
  type ApplicationCenterAction,
} from "../src/permissions/application-center-actions";

describe("App Center action permissions", () => {
  it("maps every action to the current module gate", () => {
    const actions = Object.keys(APPLICATION_CENTER_ACTION_PERMISSIONS) as ApplicationCenterAction[];
    expect(actions.length).toBeGreaterThan(5);
    for (const action of actions) {
      expect(applicationCenterPermissionFor(action)).toBe("cloudrouter.admin.access");
    }
  });

  it("gates actions on the supplied session scope", () => {
    expect(isApplicationCenterActionAllowed("templateReview", ["cloudrouter.admin.access"])).toBe(true);
    expect(isApplicationCenterActionAllowed("templateReview", ["cloudrouter.system.read"])).toBe(false);
    expect(isApplicationCenterActionAllowed("moderationDecide", [])).toBe(false);
  });
});
