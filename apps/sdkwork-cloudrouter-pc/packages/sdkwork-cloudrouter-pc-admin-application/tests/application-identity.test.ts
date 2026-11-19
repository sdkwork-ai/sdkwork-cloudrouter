import { describe, expect, it, vi } from "vitest";

import { createApplicationIdentityService } from "../src/services/application-identity";

describe("application identity service", () => {
  it("calls apps.identityProvision with the deploy uuid and returns the status", async () => {
    const provision = vi.fn(async () => ({ identityStatus: "active" }));
    const service = createApplicationIdentityService(provision);

    await expect(service.provision("  0f8b7f26-2d7c-4f43-8a4b-0c5a51e1f0aa  "))
      .resolves.toBe("active");
    expect(provision).toHaveBeenCalledWith("0f8b7f26-2d7c-4f43-8a4b-0c5a51e1f0aa");
  });

  it("defaults to active when the response omits identityStatus", async () => {
    const service = createApplicationIdentityService(async () => ({}));
    await expect(service.provision("app-1")).resolves.toBe("active");
  });

  it("refuses a blank deploy application id before calling the backend", async () => {
    const provision = vi.fn(async () => ({ identityStatus: "active" }));
    const service = createApplicationIdentityService(provision);
    await expect(service.provision("   ")).rejects.toThrow(/required/u);
    expect(provision).not.toHaveBeenCalled();
  });
});
