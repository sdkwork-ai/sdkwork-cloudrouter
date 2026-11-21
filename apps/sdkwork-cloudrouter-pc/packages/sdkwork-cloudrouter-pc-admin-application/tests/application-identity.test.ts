import { describe, expect, it, vi } from "vitest";

import { createApplicationIdentityService } from "../src/services/application-identity";

describe("application identity service", () => {
  it("calls apps.identityProvision with the deploy uuid and returns status plus anchor", async () => {
    const provision = vi.fn(async () => ({
      deployApplicationId: "410000000000000001",
      identityStatus: "active",
    }));
    const service = createApplicationIdentityService(provision);

    await expect(service.provision("  0f8b7f26-2d7c-4f43-8a4b-0c5a51e1f0aa  "))
      .resolves.toEqual({
        deployApplicationId: "410000000000000001",
        status: "active",
      });
    expect(provision).toHaveBeenCalledWith("0f8b7f26-2d7c-4f43-8a4b-0c5a51e1f0aa");
  });

  it("keeps a snowflake anchor past 2^53 exactly as the decimal string", async () => {
    const service = createApplicationIdentityService(async () => ({
      deployApplicationId: "9007199254740993",
      identityStatus: "active",
    }));

    await expect(service.provision("app-1")).resolves.toMatchObject({
      deployApplicationId: "9007199254740993",
    });
  });

  it("drops an anchor that is not the declared decimal shape", async () => {
    const service = createApplicationIdentityService(async () => ({
      deployApplicationId: "not-an-id",
      identityStatus: "active",
    }));

    await expect(service.provision("app-1")).resolves.toEqual({ status: "active" });
  });

  it("defaults to active when the response omits identityStatus", async () => {
    const service = createApplicationIdentityService(async () => ({}));
    await expect(service.provision("app-1")).resolves.toEqual({ status: "active" });
  });

  it("refuses a blank deploy application id before calling the backend", async () => {
    const provision = vi.fn(async () => ({ identityStatus: "active" }));
    const service = createApplicationIdentityService(provision);
    await expect(service.provision("   ")).rejects.toThrow(/required/u);
    expect(provision).not.toHaveBeenCalled();
  });
});
