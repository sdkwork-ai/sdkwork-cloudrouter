import type { CommerceDeploymentMode, CommerceEnvironment } from "@sdkwork/commerce-contracts";
import { createSdkworkCommerceService, type SdkworkCommerceService } from "@sdkwork/commerce-service";
import {
  assertCommerceAppSdkClient,
  assertCommerceBackendSdkClient,
  type CommerceAppSdkClient,
  type CommerceBackendSdkClient,
} from "@sdkwork/commerce-sdk-ports";
import { createSdkworkRuntimeBootstrap } from "@sdkwork/runtime-bootstrap";

export interface CommerceRuntimeConfig {
  appApiBaseUrl?: string;
  appId: string;
  backendApiBaseUrl?: string;
  deploymentMode: CommerceDeploymentMode;
  environment: CommerceEnvironment;
}

export interface CommerceFeatureFlagStore {
  isEnabled(name: string): boolean;
}

export interface MutableCommerceFeatureFlagStore extends CommerceFeatureFlagStore {
  set(name: string, enabled: boolean): void;
}

export interface CommerceRuntime {
  config: CommerceRuntimeConfig;
  featureFlagStore: CommerceFeatureFlagStore;
  service: SdkworkCommerceService;
}

export type CommercePaymentEnvironment = "web" | "wechat_official_account" | "alipay_h5";

export interface CommerceRequestPaymentInput {
  paymentProduct: string;
  payload: Record<string, unknown>;
}

export interface CommerceRequestPaymentResult {
  rawResult: unknown;
  status: "success" | "cancelled" | "failed";
}

export interface CreateCommerceRuntimeInput {
  clients: {
    app: CommerceAppSdkClient;
    backend?: CommerceBackendSdkClient;
  };
  config: CommerceRuntimeConfig;
  featureFlagStore?: CommerceFeatureFlagStore;
}

const DEFAULT_COMMERCE_FEATURE_FLAGS = {
  "commerce.admin": true,
  "commerce.audit": true,
  "commerce.cart": true,
  "commerce.catalog": true,
  "commerce.checkout": true,
  "commerce.fulfillments": true,
  "commerce.inventory": true,
  "commerce.invoices": true,
  "commerce.memberships": true,
  "commerce.orders": true,
  "commerce.payments": true,
  "commerce.promotion.code": true,
  "commerce.promotion.couponStock": true,
  "commerce.promotion.discountAllocation": true,
  "commerce.promotion.discountApplication": true,
  "commerce.promotion.offer": true,
  "commerce.promotion.points": true,
  "commerce.promotion.userCoupon": true,
  "commerce.promotions": true,
  "commerce.recharges": true,
  "commerce.refunds": true,
  "commerce.reports": true,
  "commerce.shipments": true,
  "commerce.wallet": true,
} as const;

export function createCommerceRuntime(input: CreateCommerceRuntimeInput): CommerceRuntime {
  const bootstrap = createSdkworkRuntimeBootstrap({
    clients: input.clients,
    config: input.config,
    validateAppClient: assertCommerceAppSdkClient,
    validateBackendClient: assertCommerceBackendSdkClient,
  });

  return {
    config: { ...bootstrap.config },
    featureFlagStore: input.featureFlagStore ?? createMemoryCommerceFeatureFlagStore(DEFAULT_COMMERCE_FEATURE_FLAGS),
    service: createSdkworkCommerceService({
      appClient: bootstrap.clients.app,
      backendClient: bootstrap.clients.backend,
    }),
  };
}

export function createMemoryCommerceFeatureFlagStore(
  initial: Record<string, boolean> = {},
): MutableCommerceFeatureFlagStore {
  const flags = { ...initial };

  return {
    isEnabled: (name) => Boolean(flags[name]),
    set: (name, enabled) => {
      flags[name] = enabled;
    },
  };
}

export function detectCommercePaymentEnvironment(): CommercePaymentEnvironment {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  if (userAgent.includes("micromessenger")) {
    return "wechat_official_account";
  }
  if (userAgent.includes("alipayclient")) {
    return "alipay_h5";
  }
  return "web";
}

export async function requestCommercePayment(
  input: CommerceRequestPaymentInput,
): Promise<CommerceRequestPaymentResult> {
  const paymentProduct = input.paymentProduct.trim().toLowerCase();
  if (paymentProduct === "wechat_jsapi") {
    return requestWechatJsapiPayment(input.payload);
  }
  if (paymentProduct === "alipay_wap") {
    return requestAlipayWapPayment(input.payload);
  }
  throw new Error(`Unsupported commerce payment product: ${input.paymentProduct}`);
}

async function requestWechatJsapiPayment(
  payload: Record<string, unknown>,
): Promise<CommerceRequestPaymentResult> {
  const invoke = windowRef()?.WeixinJSBridge?.invoke;
  if (typeof invoke !== "function") {
    throw new Error("WeixinJSBridge is unavailable");
  }
  return new Promise<CommerceRequestPaymentResult>((resolve) => {
    invoke("getBrandWCPayRequest", payload, (result: unknown) => {
      resolve({
        rawResult: result,
        status: mapWechatBridgeStatus(result),
      });
    });
  });
}

async function requestAlipayWapPayment(
  payload: Record<string, unknown>,
): Promise<CommerceRequestPaymentResult> {
  const call = windowRef()?.AlipayJSBridge?.call;
  if (typeof call !== "function") {
    throw new Error("AlipayJSBridge is unavailable");
  }
  return new Promise<CommerceRequestPaymentResult>((resolve) => {
    call("tradePay", payload, (result: unknown) => {
      resolve({
        rawResult: result,
        status: mapAlipayBridgeStatus(result),
      });
    });
  });
}

function mapWechatBridgeStatus(result: unknown): CommerceRequestPaymentResult["status"] {
  const errMsg = typeof result === "object" && result !== null && "err_msg" in result
    ? String((result as { err_msg?: unknown }).err_msg ?? "").toLowerCase()
    : "";
  if (errMsg.endsWith(":ok")) {
    return "success";
  }
  if (errMsg.endsWith(":cancel")) {
    return "cancelled";
  }
  return "failed";
}

function mapAlipayBridgeStatus(result: unknown): CommerceRequestPaymentResult["status"] {
  const code = typeof result === "object" && result !== null && "resultCode" in result
    ? String((result as { resultCode?: unknown }).resultCode ?? "")
    : "";
  if (code === "9000") {
    return "success";
  }
  if (code === "6001") {
    return "cancelled";
  }
  return "failed";
}

function windowRef(): {
  WeixinJSBridge?: {
    invoke?: (name: string, payload: unknown, callback?: (result: unknown) => void) => void;
  };
  AlipayJSBridge?: {
    call?: (name: string, payload: unknown, callback?: (result: unknown) => void) => void;
  };
} | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window as typeof window & {
    WeixinJSBridge?: {
      invoke?: (name: string, payload: unknown, callback?: (result: unknown) => void) => void;
    };
    AlipayJSBridge?: {
      call?: (name: string, payload: unknown, callback?: (result: unknown) => void) => void;
    };
  };
}

export type { CommerceAppSdkClient, CommerceBackendSdkClient, SdkworkCommerceService };
