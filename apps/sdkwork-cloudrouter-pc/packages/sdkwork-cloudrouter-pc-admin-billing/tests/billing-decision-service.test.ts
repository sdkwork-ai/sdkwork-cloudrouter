import assert from "node:assert/strict";
import { it } from "vitest";

import {
  createSdkworkBillingDecisionService,
  explainBillingDecision,
  type SdkworkBillingDecision,
  type SdkworkBillingDecisionClient,
  type SdkworkBillingDecisionVerdict,
} from "../src/billing-decision-service.ts";

function decision(overrides: Partial<SdkworkBillingDecision> = {}): SdkworkBillingDecision {
  return {
    invocationId: "d7b76ad8-6dc8-494f-a34b-ad444838c3df",
    holdAmount: "16443980",
    holdSettledAmount: "22297",
    holdStatus: 2,
    holdExpiresAt: "2026-11-25T14:19:18.810744+00:00",
    chargeLineCount: "3",
    chargeAmount: "0.002229640000",
    debitPoints: "22297",
    measuredQuantity: "73200.000000000000",
    verdict: "settled",
    ...overrides,
  };
}

function fakeClient(captured: { params?: unknown }, result?: SdkworkBillingDecision): SdkworkBillingDecisionClient {
  return {
    billing: {
      decision: {
        async retrieve(params: { invocationId: string }) {
          captured.params = params;
          return result ?? decision({ invocationId: params.invocationId });
        },
      },
    },
  };
}

it("reads a settled snapshot and forwards the trimmed invocation id", async () => {
  const captured: { params?: unknown } = {};
  const service = createSdkworkBillingDecisionService(fakeClient(captured));

  const result = await service.readDecision("  d7b76ad8-6dc8-494f-a34b-ad444838c3df  ");

  assert.deepEqual(captured.params, { invocationId: "d7b76ad8-6dc8-494f-a34b-ad444838c3df" });
  assert.equal(result.verdict, "settled");
  assert.equal(result.holdAmount, "16443980");
  assert.equal(result.debitPoints, "22297", "points stay exact strings");
});

it("an empty invocation id fails locally instead of calling the backend", async () => {
  let called = false;
  const client: SdkworkBillingDecisionClient = {
    billing: {
      decision: {
        async retrieve() {
          called = true;
          return decision();
        },
      },
    },
  };
  const service = createSdkworkBillingDecisionService(client);

  await assert.rejects(() => service.readDecision("   "), /invocation id is required/);
  assert.equal(called, false, "the console must not fire a request for an empty id");
});

it("every verdict maps to exactly one explanation and only overdue is unhealthy", () => {
  const verdicts: SdkworkBillingDecisionVerdict[] = [
    "not_billed",
    "held",
    "overdue",
    "settled",
    "released",
    "expired",
  ];
  const explanations = verdicts.map((verdict) => explainBillingDecision(verdict));

  assert.deepEqual(
    explanations.map((explanation) => explanation.key),
    verdicts,
    "the key must round-trip so copy lookups cannot drift",
  );
  assert.deepEqual(
    explanations.filter((explanation) => !explanation.healthy).map((explanation) => explanation.key),
    ["overdue"],
  );
  assert.deepEqual(
    explanations.filter((explanation) => explanation.freezesFunds).map((explanation) => explanation.key),
    ["held", "overdue"],
    "only an open or stuck reservation holds funds",
  );
});

it("describeDecision attaches the explanation for a stuck reservation", async () => {
  const service = createSdkworkBillingDecisionService(
    fakeClient({}, decision({ verdict: "overdue", holdSettledAmount: "0", chargeLineCount: "0" })),
  );

  const described = await service.describeDecision("47cd79ea-b469-4079-9861-b9cc5bb938dc");

  assert.equal(described.decision.verdict, "overdue");
  assert.equal(described.decision.holdAmount, "16443980");
  assert.equal(described.explanation.healthy, false);
  assert.equal(described.explanation.freezesFunds, true);
});

it("a dispatch rejection reads as not billed with no reservation", async () => {
  const service = createSdkworkBillingDecisionService(
    fakeClient(
      {},
      decision({
        verdict: "not_billed",
        holdAmount: null,
        holdSettledAmount: null,
        holdStatus: null,
        holdExpiresAt: null,
        chargeLineCount: "0",
        chargeAmount: "0",
        debitPoints: "0",
        measuredQuantity: "0",
      }),
    ),
  );

  const described = await service.describeDecision("50cde1ff-d1ba-42c0-8e1b-5fd01417e699");

  assert.equal(described.decision.holdAmount, null);
  assert.equal(described.explanation.healthy, true);
  assert.equal(described.explanation.freezesFunds, false);
});
