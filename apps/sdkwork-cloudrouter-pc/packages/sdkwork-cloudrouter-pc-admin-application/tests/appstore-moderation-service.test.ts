import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AppStoreModerationServiceError,
  createAppStoreModerationService,
  isAppStoreModerationForbidden,
  type AppStoreModerationTransport,
} from "../src/services/appstore-moderation";

const queueList = vi.fn();
const decisionCreate = vi.fn();
const assignReview = vi.fn();
const retrieveReview = vi.fn();
const listAppeals = vi.fn();
const decideAppeal = vi.fn();

const transport: AppStoreModerationTransport = {
  moderation: {
    appstore: {
      moderation: {
        queue: { list: queueList },
        decisions: { create: decisionCreate },
        reviews: { assign: assignReview, retrieve: retrieveReview },
        appeals: { list: listAppeals, decide: decideAppeal },
      },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("App Store moderation service", () => {
  it("maps the cursor page and normalizes statuses", async () => {
    queueList.mockResolvedValue({
      items: [
        {
          review_id: "rev-1",
          listing_id: "listing-1",
          listing_name: "Acme Notes",
          submission_type: "release",
          review_status: "pending",
          assigned_to: "user-1",
          submitted_at: "2026-11-16T08:00:00Z",
          priority: 3,
        },
      ],
      pageInfo: { mode: "cursor", hasMore: true, nextCursor: "next-1" },
    });

    const service = createAppStoreModerationService(transport);
    const page = await service.listQueue({ reviewStatus: "PENDING", pageSize: 20 });

    expect(queueList).toHaveBeenCalledWith({ reviewStatus: "PENDING", pageSize: 20 });
    expect(page.items).toEqual([{
      reviewId: "rev-1",
      listingId: "listing-1",
      listingName: "Acme Notes",
      submissionType: "RELEASE",
      reviewStatus: "PENDING",
      assignedTo: "user-1",
      priority: 3,
      submittedAt: "2026-11-16T08:00:00Z",
    }]);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("next-1");
  });

  it("records a decision with an idempotency key", async () => {
    decisionCreate.mockResolvedValue({ item: { reviewId: "rev-1" } });

    const service = createAppStoreModerationService(transport);
    await service.decide("rev-1", {
      decisionType: "REJECT",
      reasonCode: "policy_violation",
      reasonDetail: "The screenshots show unreleased features.",
    });

    expect(decisionCreate).toHaveBeenCalledWith(
      "rev-1",
      {
        decisionType: "REJECT",
        decisionStatus: "FINAL",
        reasonCode: "policy_violation",
        reasonDetail: "The screenshots show unreleased features.",
      },
      { idempotencyKey: expect.any(String) },
    );
  });

  it("requires a reason for a non-approval decision", async () => {
    const service = createAppStoreModerationService(transport);
    await expect(service.decide("rev-1", { decisionType: "REQUEST_CHANGES" }))
      .rejects.toBeInstanceOf(AppStoreModerationServiceError);
    expect(decisionCreate).not.toHaveBeenCalled();
  });

  it("assigns a review to an operator", async () => {
    assignReview.mockResolvedValue({ item: { reviewId: "rev-1" } });
    const service = createAppStoreModerationService(transport);

    await service.assign?.("rev-1", "operator-1");
    expect(assignReview).toHaveBeenCalledWith("rev-1", { assignedTo: "operator-1" });
    await expect(service.assign?.("rev-1", " "))
      .rejects.toBeInstanceOf(AppStoreModerationServiceError);
  });

  it("loads review details with raw attributes", async () => {
    retrieveReview.mockResolvedValue({
      item: {
        reviewId: "rev-1",
        listingName: "Acme Notes",
        submissionType: "RELEASE",
        reviewStatus: "IN_REVIEW",
        assignedTo: "operator-1",
        updatedAt: "2026-11-12T00:00:00Z",
        changelog: "Fix crash",
      },
    });
    const service = createAppStoreModerationService(transport);
    const review = await service.getReview?.("rev-1");

    expect(retrieveReview).toHaveBeenCalledWith("rev-1");
    expect(review).toEqual(expect.objectContaining({
      reviewId: "rev-1",
      listingName: "Acme Notes",
      reviewStatus: "IN_REVIEW",
      updatedAt: "2026-11-12T00:00:00Z",
    }));
    expect(review?.attributes).toEqual(expect.objectContaining({ changelog: "Fix crash" }));
  });

  it("lists and decides moderation appeals", async () => {
    listAppeals.mockResolvedValue({
      items: [{
        appeal_id: "appeal-1",
        review_id: "rev-1",
        appeal_status: "pending",
        appeal_reason: "The rejection missed the new screenshots.",
        submitted_at: "2026-11-13T00:00:00Z",
      }],
      pageInfo: { mode: "cursor", hasMore: false },
    });
    decideAppeal.mockResolvedValue({ item: { appealId: "appeal-1" } });
    const service = createAppStoreModerationService(transport);

    const page = await service.listAppeals?.({ status: "PENDING", pageSize: 50 });
    expect(listAppeals).toHaveBeenCalledWith({ status: "PENDING", pageSize: 50 });
    expect(page?.items).toEqual([expect.objectContaining({
      appealId: "appeal-1",
      reviewId: "rev-1",
      appealStatus: "PENDING",
      appealReason: "The rejection missed the new screenshots.",
    })]);

    await service.decideAppeal?.("appeal-1", { decision: "APPROVE", note: "Re-review accepted" });
    expect(decideAppeal).toHaveBeenCalledWith("appeal-1", {
      decision: "APPROVE",
      note: "Re-review accepted",
    });
    await expect(service.decideAppeal?.("appeal-1", { decision: "REJECT", note: " " }))
      .rejects.toBeInstanceOf(AppStoreModerationServiceError);
  });

  it("normalizes forbidden and validation failures", async () => {
    queueList.mockRejectedValue({ status: 403, detail: "no permission" });
    const service = createAppStoreModerationService(transport);

    const forbidden = await service.listQueue().catch((error: unknown) => error);
    expect(isAppStoreModerationForbidden(forbidden)).toBe(true);

    decisionCreate.mockRejectedValue({ status: 422, detail: "invalid reason" });
    const invalid = await service.decide("rev-1", {
      decisionType: "APPROVE",
    }).catch((error: unknown) => error);
    expect(invalid).toBeInstanceOf(AppStoreModerationServiceError);
    expect((invalid as AppStoreModerationServiceError).kind).toBe("validation");
  });
});
