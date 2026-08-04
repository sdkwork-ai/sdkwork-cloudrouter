import assert from "node:assert/strict";
import test from "node:test";

import {
  clearStoredAppSessionToken,
  storeAppSessionFromResult,
} from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";
import { resetClawRouterSdkClients } from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import {
  backendPromotionCodesList,
  buildCodeBatchCreateRequest,
  buildCouponOfferCreateRequests,
  buildDistributionTaskRequest,
  createCouponOffer,
  createIdempotencyKey,
  offerRecordToFormValues,
  toDatetimeLocal,
  maskPromotionCode,
  toIsoString,
  type CouponOfferCreateFormValues,
} from "./packages/sdkwork-clawrouter-pc-admin-marketing/src/marketingService.ts";

const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

type CapturedSdkRequest = {
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
};

type MarketingSdkResponder = (request: CapturedSdkRequest, index: number) => unknown;

async function withMarketingSdkResponder<T>(
  responder: MarketingSdkResponder,
  fn: (captured: CapturedSdkRequest[]) => Promise<T>,
): Promise<T> {
  const captured: CapturedSdkRequest[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: { dispatchEvent: () => true },
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    captured.push({
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : "",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    });
    const request = captured[captured.length - 1];
    const responseBody = responder(request, captured.length - 1);
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  clearStoredAppSessionToken();
  storeAppSessionFromResult({
    code: "2000",
    data: { accessToken: "test-access-token", authToken: "test-auth-token" },
  });
  resetClawRouterSdkClients();

  try {
    return await fn(captured);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
}

function baseFormValues(overrides: Partial<CouponOfferCreateFormValues> = {}): CouponOfferCreateFormValues {
  return {
    displayName: "Welcome Coupon",
    offerType: "COUPON",
    description: "",
    audienceScope: "ALL",
    combinability: "EXCLUSIVE",
    goodsScope: "ALL",
    priority: 100,
    startsAt: "2026-08-01T00:00",
    endsAt: "",
    status: 1,
    benefitKind: "token_bank_credit",
    discountType: "FIXED",
    discountValue: "10",
    minimumAmount: "0",
    maximumDiscountAmount: "",
    currencyCode: "CNY",
    grantAmount: "500",
    stockType: "LIMITED",
    codeIssueMode: "REALTIME",
    totalQuantity: "1000",
    perUserLimit: 1,
    claimStartsAt: "",
    claimEndsAt: "",
    ...overrides,
  };
}

test("realtime coupon form normalizes into offer and stock requests without batch", () => {
  const requests = buildCouponOfferCreateRequests(baseFormValues(), "idem-1");

  assert.equal(requests.offerRequest.displayName, "Welcome Coupon");
  assert.equal(requests.offerRequest.startsAt, new Date("2026-08-01T00:00").toISOString());
  assert.deepEqual(requests.offerRequest.couponBenefit, {
    kind: "token_bank_credit",
    grantAmount: "500",
  });
  assert.equal(requests.stockRequest.codeIssueMode, "REALTIME");
  assert.equal(requests.stockRequest.stockType, "LIMITED");
  assert.equal(requests.stockRequest.totalQuantity, "1000");
  assert.equal(requests.stockRequest.offerId, "");
  assert.equal(requests.codeBatchRequest, undefined);
});

test("batch coupon form normalizes into offer, stock, and batch requests", () => {
  const requests = buildCouponOfferCreateRequests(
    baseFormValues({
      codeIssueMode: "BATCH",
      batchQuantity: "200",
      batchCodeLength: 20,
      batchCodePrefix: "WELCOME",
    }),
    "idem-batch-1",
  );

  assert.equal(requests.stockRequest.codeIssueMode, "BATCH");
  assert.ok(requests.codeBatchRequest);
  assert.equal(requests.codeBatchRequest.quantity, "200");
  assert.equal(requests.codeBatchRequest.codeLength, 20);
  assert.equal(requests.codeBatchRequest.codePrefix, "WELCOME");
  assert.equal(requests.codeBatchRequest.idempotencyKey, "idem-batch-1");
});

test("subscription coupon form emits subscription benefit", () => {
  const requests = buildCouponOfferCreateRequests(
    baseFormValues({
      benefitKind: "subscription",
      productId: "seed-product-membership",
      skuId: "sku-standard-monthly",
      packageId: "1002",
      period: "month",
      durationDays: "30",
      dailyQuota: "1000",
      totalQuota: "30000",
      grantAmount: undefined,
    }),
    "idem-sub-1",
  );

  assert.deepEqual(requests.offerRequest.couponBenefit, {
    kind: "subscription",
    productId: "seed-product-membership",
    skuId: "sku-standard-monthly",
    packageId: "1002",
    period: "month",
    durationDays: "30",
    dailyQuota: "1000",
    totalQuota: "30000",
  });
});

test("code batch create form normalizes with idempotency key", () => {
  const request = buildCodeBatchCreateRequest(
    {
      stockId: "42",
      codeType: "PUBLIC",
      quantity: "300",
      codeLength: 16,
      codePrefix: "VIP",
      startsAt: "2026-08-01T00:00",
    },
    "idem-code-batch",
  );

  assert.equal(request.stockId, "42");
  assert.equal(request.quantity, "300");
  assert.equal(request.codePrefix, "VIP");
  assert.equal(request.startsAt, new Date("2026-08-01T00:00").toISOString());
  assert.equal(request.expiresAt, null);
  assert.equal(request.idempotencyKey, "idem-code-batch");
});

test("toDatetimeLocal converts ISO time to local datetime-local value", () => {
  const local = toDatetimeLocal(new Date("2026-08-01T08:30:00.000Z").toISOString());
  assert.match(local, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assert.equal(new Date(local).getTime(), new Date("2026-08-01T08:30:00.000Z").getTime());
  assert.equal(toDatetimeLocal("not-a-date"), "");
});

test("offerRecordToFormValues maps offer record for duplication", () => {
  const values = offerRecordToFormValues({
    id: "42",
    offer_no: "offer-1",
    display_name: "Welcome Coupon",
    offer_type: "COUPON",
    audience_scope: "ALL",
    combinability: "EXCLUSIVE",
    goods_scope: "ALL",
    priority: 100,
    starts_at: "2026-08-01T00:00:00.000Z",
    ends_at: null,
    status: 1,
    discount_type: "FIXED",
    discount_value: "10",
    minimum_amount: "0",
    maximum_discount_amount: "50",
    currency_code: "CNY",
    coupon_benefit: { kind: "token_bank_credit", targetAsset: "token_bank", grantAmount: "500" },
  });

  assert.equal(values.displayName, "Welcome Coupon (Copy)");
  assert.equal(values.benefitKind, "token_bank_credit");
  assert.equal(values.grantAmount, "500");
  assert.equal(values.discountValue, "10");
  assert.equal(values.maximumDiscountAmount, "50");
  assert.equal(values.currencyCode, "CNY");
  assert.equal(new Date(values.startsAt).getTime(), new Date("2026-08-01T00:00:00.000Z").getTime());
  // 复制时发行设置重置为默认（库存/批次不复制）
  assert.equal(values.stockType, "LIMITED");
  assert.equal(values.codeIssueMode, "REALTIME");
  assert.equal(values.totalQuantity, "");
});

test("unlimited stock form sends zero total quantity for statistics", () => {
  const requests = buildCouponOfferCreateRequests(
    baseFormValues({ stockType: "UNLIMITED", totalQuantity: "" }),
    "idem-unlimited-1",
  );

  assert.equal(requests.stockRequest.stockType, "UNLIMITED");
  assert.equal(requests.stockRequest.totalQuantity, "0");
});

test("distribution task request normalizes stock and user ids", () => {
  const request = buildDistributionTaskRequest("42", ["1001", "1002"], "idem-dist-1");
  assert.equal(request.stockId, "42");
  assert.deepEqual(request.ownerUserIds, ["1001", "1002"]);
  assert.equal(request.idempotencyKey, "idem-dist-1");
});

test("offerRecordToFormValues maps subscription benefit", () => {
  const values = offerRecordToFormValues({
    id: "43",
    display_name: "Sub Coupon",
    status: 0,
    coupon_benefit: {
      kind: "subscription",
      productId: "p-1",
      skuId: "s-1",
      packageId: "1002",
      period: "month",
      durationDays: "30",
      dailyQuota: "1000",
      totalQuota: "30000",
    },
  });

  assert.equal(values.benefitKind, "subscription");
  assert.equal(values.packageId, "1002");
  assert.equal(values.dailyQuota, "1000");
  assert.equal(values.totalQuota, "30000");
  assert.equal(values.status, 0);
});

test("createIdempotencyKey falls back outside secure contexts", () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: undefined },
    });
    const key = createIdempotencyKey();
    assert.ok(key.length >= 10);
    assert.match(key, /^mk-/);
    const second = createIdempotencyKey();
    assert.notEqual(key, second);
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'crypto', originalDescriptor);
    } else {
      delete (globalThis as { crypto?: unknown }).crypto;
    }
  }
});

test("maskPromotionCode keeps first and last four characters for long codes", () => {
  assert.equal(maskPromotionCode("WELCOME2026VIP0001"), "WELC****0001");
  assert.equal(maskPromotionCode("SHORT"), "****");
});

test("toIsoString converts datetime-local input to UTC ISO", () => {
  assert.equal(toIsoString("2026-08-01T08:30"), new Date("2026-08-01T08:30").toISOString());
  assert.throws(() => toIsoString("not-a-date"), /Invalid date time value/);
});

test("createCouponOffer chains offer, stock, and batch creation through the sdk", async () => {
  await withMarketingSdkResponder((request, index) => {
    if (index === 0) {
      assert.equal(request.url, "/backend/v3/api/promotions/offers");
      assert.equal(request.method, "POST");
      const body = JSON.parse(request.body);
      assert.equal(body.displayName, "Welcome Coupon");
      return {
        code: 0,
        data: {
          item: { id: "offer-1", displayName: "Welcome Coupon", status: 1 },
        },
        traceId: "t-1",
      };
    }
    if (index === 1) {
      assert.equal(request.url, "/backend/v3/api/promotions/coupon_stocks");
      const body = JSON.parse(request.body);
      assert.equal(body.offerId, "offer-1");
      assert.equal(body.codeIssueMode, "BATCH");
      return {
        code: 0,
        data: { item: { id: "stock-1", codeIssueMode: "BATCH", status: 1 } },
        traceId: "t-2",
      };
    }
    assert.equal(request.url, "/backend/v3/api/promotions/code_batches");
    const body = JSON.parse(request.body);
    assert.equal(body.stockId, "stock-1");
    assert.equal(body.idempotencyKey, "idem-create-1");
    return {
      code: 0,
      data: {
        item: { id: "batch-1", status: "READY", generatedQuantity: "200" },
      },
      traceId: "t-3",
    };
  }, async (captured) => {
    const result = await createCouponOffer(
      baseFormValues({
        codeIssueMode: "BATCH",
        batchQuantity: "200",
        batchCodeLength: 16,
      }),
      "idem-create-1",
    );

    assert.equal(result.offer.id, "offer-1");
    assert.equal(result.stock.id, "stock-1");
    assert.equal(result.codeBatch?.id, "batch-1");
    assert.equal(captured.length, 3);
  });
});

test("backendPromotionCodesList passes codeBatchId as code_batch_id query", async () => {
  await withMarketingSdkResponder((request) => {
    assert.equal(request.url, "/backend/v3/api/promotions/codes?page=1&page_size=20&code_batch_id=7");
    return {
      code: 0,
      data: {
        items: [{ id: "code-1", codeNo: "code-1", promotionCode: "WELC****0001", status: 1 }],
        pageInfo: { page: 1, pageSize: 20, total: 1 },
      },
      traceId: "t-4",
    };
  }, async () => {
    const page = await backendPromotionCodesList({ page: 1, pageSize: 20, codeBatchId: "7" });
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0]["codeNo"], "code-1");
  });
});
