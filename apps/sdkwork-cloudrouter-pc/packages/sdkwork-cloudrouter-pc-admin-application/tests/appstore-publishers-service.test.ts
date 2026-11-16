import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AppStorePublisherServiceError,
  createAppStorePublisherService,
  isAppStorePublisherForbidden,
  type AppStorePublisherTransport,
} from "../src/services/appstore-publishers";

const list = vi.fn();
const verify = vi.fn();

const transport: AppStorePublisherTransport = {
  publishers: {
    appstore: {
      publishers: {
        admin: { list, verify },
      },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("App Store publisher service", () => {
  it("maps the publisher cursor page", async () => {
    list.mockResolvedValue({
      items: [
        {
          id: "pub-1",
          display_name: "Acme Studio",
          publisher_type: "COMPANY",
          status: "ACTIVE",
          verification_status: "PENDING",
          support_email: "support@acme.test",
          website_url: "https://acme.test",
          created_at: "2026-11-01T00:00:00Z",
        },
      ],
      pageInfo: { mode: "cursor", hasMore: true, nextCursor: "next-1" },
    });

    const service = createAppStorePublisherService(transport);
    const page = await service.list({ pageSize: 50 });

    expect(list).toHaveBeenCalledWith({ pageSize: 50 });
    expect(page.items).toEqual([{
      publisherId: "pub-1",
      displayName: "Acme Studio",
      publisherType: "COMPANY",
      status: "ACTIVE",
      verificationStatus: "PENDING",
      supportEmail: "support@acme.test",
      websiteUrl: "https://acme.test",
      createdAt: "2026-11-01T00:00:00Z",
    }]);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("next-1");
  });

  it("records a verification decision", async () => {
    verify.mockResolvedValue({ accepted: true });

    const service = createAppStorePublisherService(transport);
    await service.verify("pub-1", { verificationType: "BUSINESS", decision: "REJECT" });

    expect(verify).toHaveBeenCalledWith("pub-1", {
      verificationType: "BUSINESS",
      decision: "REJECT",
    });
  });

  it("normalizes forbidden failures", async () => {
    list.mockRejectedValue({ status: 403, detail: "no permission" });
    const service = createAppStorePublisherService(transport);
    const error = await service.list().catch((nextError: unknown) => nextError);

    expect(error).toBeInstanceOf(AppStorePublisherServiceError);
    expect(isAppStorePublisherForbidden(error)).toBe(true);
  });
});
