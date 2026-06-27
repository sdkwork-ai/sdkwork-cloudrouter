import { describe, expect, it } from "vitest";
import {
  createPointsRouteIntent,
  createPointsWorkspaceManifest,
  pointsPackageMeta,
} from "../src";

describe("sdkwork-commerce-pc-points headless contract", () => {
  it("creates a points workspace manifest and route intent for reusable host routing", () => {
    expect(pointsPackageMeta).toMatchObject({
      domain: "commerce",
      package: "@sdkwork/commerce-pc-points",
    });

    expect(
      createPointsWorkspaceManifest({
        title: "Points",
      }),
    ).toMatchObject({
      capability: "points",
      packageNames: ["@sdkwork/commerce-pc-points", "@sdkwork/commerce-pc-wallet"],
      routePath: "/points",
      title: "Points",
    });

    expect(
      createPointsRouteIntent({
        sectionId: "transactions",
      }),
    ).toEqual({
      focusWindow: true,
      route: "/points?section=transactions",
      sectionId: "transactions",
      source: "points-workspace",
      type: "points-route-intent",
    });
  });
});
