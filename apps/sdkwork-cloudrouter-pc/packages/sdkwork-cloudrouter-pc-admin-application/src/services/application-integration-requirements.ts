/**
 * What each Deploy application kind needs from the account-integration layer.
 *
 * One application is one endpoint, so a H5 app, a WeChat mini program, a native
 * iOS build and an API service do not share the same channel or checkout
 * requirements. This module is the single interpretation of that matrix: the
 * drawer renders it as a readiness checklist and the validator turns the gaps
 * into localized findings. It is side-effect free so it can be unit tested
 * without a catalog or a page.
 */

import type {
  ApplicationEnvironmentIntegration,
  BindableApplicationEnvironment,
  ChannelAccountKind,
} from "../types/application-integrations";
import { BINDABLE_APPLICATION_ENVIRONMENTS } from "../types/application-integrations";

/** Semantic family of a Deploy application kind. */
export type ApplicationIntegrationSurfaceId =
  | "android"
  | "api"
  | "desktop"
  | "douyin-mini-program"
  | "flutter"
  | "harmonyos"
  | "h5"
  | "ios"
  | "pc"
  | "unknown"
  | "wechat-mini-program"
  | "web-legacy";

/** The account a surface can use for sign-in continuity. */
export type ApplicationIntegrationAutoLoginChannel =
  | "mini-program"
  | "native"
  | "none"
  | "official-account";

/** One binding slot the integration document can satisfy. */
export type IntegrationRequirementKey = "mini-program" | "official-account" | "payment-account";

/** Ready / incomplete / not applicable, with the slots still missing. */
export type ApplicationIntegrationReadinessStatus = "incomplete" | "not-applicable" | "ready";

export interface ApplicationIntegrationReadinessDimension {
  status: ApplicationIntegrationReadinessStatus;
  missing: readonly IntegrationRequirementKey[];
}

/**
 * The requirement profile of one application kind.
 *
 * `requires` blocks the readiness badge but never the save: an operator may
 * legitimately bind payment before the channel account is approved. The
 * validator reports `required-integration-missing` as a warning for the same
 * reason, while a binding that the kind cannot use at all is an error.
 */
export interface ApplicationIntegrationSurface {
  id: ApplicationIntegrationSurfaceId;
  /** The `appKind` value this profile was resolved from. */
  appKind: string;
  /** Channel account kinds the surface can act as. */
  channelKinds: readonly ChannelAccountKind[];
  /** `true` when the surface can settle money through a payment account. */
  paymentApplies: boolean;
  /** The channel that keeps a signed-in session across launches. */
  autoLogin: ApplicationIntegrationAutoLoginChannel;
  /** `true` when the surface opens the platform cashier. */
  checkout: boolean;
  requires: readonly IntegrationRequirementKey[];
  recommends: readonly IntegrationRequirementKey[];
  /** Provider-code prefixes the channel/payment accounts must belong to. */
  channelProviderPrefixes?: readonly string[];
  paymentProviderPrefixes?: readonly string[];
}

export interface ApplicationIntegrationReadiness {
  surface: ApplicationIntegrationSurface;
  channel: ApplicationIntegrationReadinessDimension;
  payment: ApplicationIntegrationReadinessDimension;
  autoLogin: ApplicationIntegrationReadinessDimension;
  checkout: ApplicationIntegrationReadinessDimension;
}

const WEB_SURFACE_BASE = {
  autoLogin: "official-account",
  channelKinds: ["official-account"],
  checkout: true,
  paymentApplies: true,
  requires: [],
  recommends: ["official-account", "payment-account"],
} as const;

const NATIVE_SURFACE_BASE = {
  autoLogin: "native",
  channelKinds: [],
  checkout: true,
  paymentApplies: true,
  requires: [],
  recommends: ["payment-account"],
} as const;

const SURFACES: Record<Exclude<ApplicationIntegrationSurfaceId, "unknown">, ApplicationIntegrationSurface> = {
  "web-legacy": {
    ...WEB_SURFACE_BASE,
    appKind: "STATIC_WEB",
    id: "web-legacy",
    recommends: ["official-account", "payment-account"],
  },
  h5: {
    ...WEB_SURFACE_BASE,
    appKind: "H5_WEB",
    id: "h5",
  },
  pc: {
    ...WEB_SURFACE_BASE,
    appKind: "PC_WEB",
    id: "pc",
  },
  "wechat-mini-program": {
    appKind: "WECHAT_MINIPROGRAM",
    autoLogin: "mini-program",
    channelKinds: ["official-account", "mini-program"],
    checkout: true,
    channelProviderPrefixes: ["wechat", "weixin", "wx"],
    id: "wechat-mini-program",
    paymentApplies: true,
    paymentProviderPrefixes: ["wechat_pay", "wechat", "sandbox"],
    recommends: ["official-account", "payment-account"],
    requires: ["mini-program"],
  },
  "douyin-mini-program": {
    appKind: "DOUYIN_MINIPROGRAM",
    autoLogin: "mini-program",
    channelKinds: ["mini-program"],
    checkout: true,
    channelProviderPrefixes: ["douyin", "bytedance", "tt"],
    id: "douyin-mini-program",
    paymentApplies: true,
    paymentProviderPrefixes: ["douyin", "bytedance", "tt", "sandbox"],
    recommends: ["payment-account"],
    requires: ["mini-program"],
  },
  flutter: {
    ...NATIVE_SURFACE_BASE,
    appKind: "FLUTTER_APP",
    id: "flutter",
  },
  ios: {
    ...NATIVE_SURFACE_BASE,
    appKind: "IOS_APP",
    id: "ios",
  },
  android: {
    ...NATIVE_SURFACE_BASE,
    appKind: "ANDROID_APP",
    id: "android",
  },
  harmonyos: {
    ...NATIVE_SURFACE_BASE,
    appKind: "HARMONYOS_APP",
    id: "harmonyos",
  },
  desktop: {
    ...NATIVE_SURFACE_BASE,
    appKind: "DESKTOP_APP",
    id: "desktop",
  },
  api: {
    appKind: "API_SERVICE",
    autoLogin: "none",
    channelKinds: [],
    checkout: false,
    id: "api",
    paymentApplies: false,
    recommends: [],
    requires: [],
  },
};

const UNKNOWN_SURFACE: ApplicationIntegrationSurface = {
  appKind: "UNKNOWN",
  autoLogin: "none",
  channelKinds: ["official-account", "mini-program"],
  checkout: true,
  id: "unknown",
  paymentApplies: true,
  recommends: ["payment-account"],
  requires: [],
};

/** Resolves the requirement profile for a Deploy `appKind`. */
export function resolveApplicationIntegrationSurface(appKind: string | undefined): ApplicationIntegrationSurface {
  const normalized = (appKind ?? "").trim().toUpperCase();
  switch (normalized) {
    case "H5_WEB":
      return SURFACES.h5;
    case "PC_WEB":
      return SURFACES.pc;
    case "STATIC_WEB":
    case "SPA_WEB":
      return SURFACES["web-legacy"];
    case "WECHAT_MINIPROGRAM":
      return SURFACES["wechat-mini-program"];
    case "DOUYIN_MINIPROGRAM":
      return SURFACES["douyin-mini-program"];
    case "FLUTTER_APP":
      return SURFACES.flutter;
    case "IOS_APP":
      return SURFACES.ios;
    case "ANDROID_APP":
      return SURFACES.android;
    case "HARMONYOS_APP":
      return SURFACES.harmonyos;
    case "DESKTOP_APP":
      return SURFACES.desktop;
    case "API_SERVICE":
      return SURFACES.api;
    default:
      return UNKNOWN_SURFACE;
  }
}

/**
 * Normalizes an app environment key to the five bindable lifecycle values.
 *
 * Deploy lets an app register extra environment keys, but a resource-link row
 * is constrained to the fleet lifecycle. Returning `undefined` lets the drawer
 * explain the limitation instead of letting the write fail with a 400.
 */
export function normalizeBindableEnvironmentKey(
  key: string | undefined,
): BindableApplicationEnvironment | undefined {
  const normalized = (key ?? "").trim().toLowerCase();
  return (BINDABLE_APPLICATION_ENVIRONMENTS as readonly string[]).includes(normalized)
    ? (normalized as BindableApplicationEnvironment)
    : undefined;
}

/** `true` when one app environment key may carry account bindings. */
export function isBindableEnvironmentKey(key: string | undefined): boolean {
  return normalizeBindableEnvironmentKey(key) !== undefined;
}

/** `true` when the integration has any binding at all. */
export function hasAnyIntegration(integration: ApplicationEnvironmentIntegration): boolean {
  return Boolean(integration.officialAccount)
    || Boolean(integration.miniProgram)
    || integration.paymentAccounts.length > 0;
}

/** Resolves the bindings a readiness evaluation should count. */
function requirementSatisfied(
  requirement: IntegrationRequirementKey,
  integration: ApplicationEnvironmentIntegration,
): boolean {
  switch (requirement) {
    case "official-account":
      return Boolean(integration.officialAccount);
    case "mini-program":
      return Boolean(integration.miniProgram);
    case "payment-account":
      return integration.paymentAccounts.length > 0;
  }
}

function missingRequirements(
  requirements: readonly IntegrationRequirementKey[],
  integration: ApplicationEnvironmentIntegration,
): IntegrationRequirementKey[] {
  return requirements.filter((requirement) => !requirementSatisfied(requirement, integration));
}

/**
 * Evaluates one environment's configuration against its application kind.
 *
 * The result drives the drawer checklist and the list-row readiness chips. An
 * empty environment is not "ready": a commercial surface still needs its
 * channel and cashier wiring, and the caller decides how loudly to say so.
 */
export function evaluateApplicationIntegrationReadiness(input: {
  appKind: string | undefined;
  integration: ApplicationEnvironmentIntegration;
}): ApplicationIntegrationReadiness {
  const surface = resolveApplicationIntegrationSurface(input.appKind);
  const { integration } = input;
  const missingRequiredChannels = missingRequirements(
    surface.requires.filter((requirement) => requirement !== "payment-account"),
    integration,
  );
  const channelStatus: ApplicationIntegrationReadinessStatus = surface.channelKinds.length === 0
    ? "not-applicable"
    : missingRequiredChannels.length > 0
      ? "incomplete"
      : "ready";

  const paymentReady = integration.paymentAccounts.length > 0;
  const payment: ApplicationIntegrationReadinessDimension = surface.paymentApplies
    ? { status: paymentReady ? "ready" : "incomplete", missing: paymentReady ? [] : ["payment-account"] }
    : { missing: [], status: "not-applicable" };

  const autoLoginRequirement: IntegrationRequirementKey | undefined = surface.autoLogin === "official-account"
    ? "official-account"
    : surface.autoLogin === "mini-program"
      ? "mini-program"
      : undefined;
  const autoLogin: ApplicationIntegrationReadinessDimension = autoLoginRequirement === undefined
    ? { missing: [], status: "not-applicable" }
    : requirementSatisfied(autoLoginRequirement, integration)
      ? { missing: [], status: "ready" }
      : { missing: [autoLoginRequirement], status: "incomplete" };

  const checkoutReady = paymentReady && (surface.channelKinds.length === 0 || !missingRequiredChannels.length);
  const checkout: ApplicationIntegrationReadinessDimension = surface.checkout
    ? {
      missing: checkoutReady
        ? []
        : [
          ...(paymentReady ? [] : ["payment-account" as const]),
          ...missingRequiredChannels,
        ],
      status: checkoutReady ? "ready" : "incomplete",
    }
    : { missing: [], status: "not-applicable" };

  return { autoLogin, channel: { missing: missingRequiredChannels, status: channelStatus }, checkout, payment, surface };
}

/** `true` when the provider code belongs to one of the allowed prefixes. */
export function matchesProviderPrefix(
  providerCode: string | undefined,
  prefixes: readonly string[] | undefined,
): boolean {
  if (!prefixes || prefixes.length === 0) {
    return true;
  }
  const normalized = (providerCode ?? "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return prefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}_`) || normalized.startsWith(prefix));
}

/** Requirement order used by the readiness checklist. */
export const INTEGRATION_REQUIREMENT_ORDER: readonly IntegrationRequirementKey[] = [
  "official-account",
  "mini-program",
  "payment-account",
];

/** `true` when the app kind is a first-class WeChat surface. */
export function isWechatSurface(surface: ApplicationIntegrationSurface): boolean {
  return surface.id === "wechat-mini-program"
    || surface.id === "h5"
    || surface.id === "pc"
    || surface.id === "web-legacy";
}

/** `true` when the app kind is a Douyin surface. */
export function isDouyinSurface(surface: ApplicationIntegrationSurface): boolean {
  return surface.id === "douyin-mini-program";
}
