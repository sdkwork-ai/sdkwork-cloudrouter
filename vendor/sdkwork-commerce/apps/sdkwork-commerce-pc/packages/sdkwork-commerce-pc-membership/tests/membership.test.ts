import { describe, expect, it } from "vitest";
import {
  createMembershipRouteIntent,
  createMembershipWorkspaceManifest,
  summarizeSdkworkMembershipBenefits,
  summarizeSdkworkMembershipLevels,
  membershipPackageMeta,
} from "../src";

describe("sdkwork-commerce-pc-membership headless contract", () => {
  it("creates reusable membership manifests, route intents, and commercial digests", () => {
    expect(membershipPackageMeta).toMatchObject({
      domain: "commerce",
      package: "@sdkwork/commerce-pc-membership",
    });

    expect(
      createMembershipWorkspaceManifest({
        title: "Membership",
      }),
    ).toMatchObject({
      capability: "membership",
      packageNames: ["@sdkwork/commerce-pc-membership"],
      routePath: "/memberships",
      title: "Membership",
    });

    expect(
      createMembershipRouteIntent({
        sectionId: "benefits",
      }),
    ).toEqual({
      focusWindow: true,
      route: "/memberships?section=benefits",
      sectionId: "benefits",
      source: "membership-workspace",
      type: "membership-route-intent",
    });

    expect(
      summarizeSdkworkMembershipBenefits([
        {
          claimed: true,
          id: "a",
          name: "Priority rendering",
          usageLimit: 10,
          usedCount: 2,
        },
        {
          claimed: false,
          id: "b",
          name: "Priority support",
          usageLimit: 1,
          usedCount: 0,
        },
      ]),
    ).toMatchObject({
      claimedBenefits: 1,
      limitedBenefits: 2,
      totalBenefits: 2,
      unusedLimitedBenefits: 1,
    });

    expect(
      summarizeSdkworkMembershipLevels([
        {
          id: "1",
          isCurrent: false,
          levelValue: 1,
          name: "Free",
          requiredPoints: 0,
        },
        {
          id: "2",
          isCurrent: true,
          levelValue: 2,
          name: "Plus",
          requiredPoints: 200,
        },
        {
          id: "3",
          isCurrent: false,
          levelValue: 3,
          name: "Pro",
          requiredPoints: 500,
        },
      ]),
    ).toMatchObject({
      currentLevelName: "Plus",
      highestLevelName: "Pro",
      levelCount: 3,
      nextLevelName: "Pro",
    });
  });
});
