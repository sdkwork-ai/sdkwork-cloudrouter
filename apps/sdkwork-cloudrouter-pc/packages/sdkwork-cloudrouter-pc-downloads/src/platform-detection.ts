import { isBlank } from "@sdkwork/utils/string";
import type {
  SdkworkDownloadAction,
  SdkworkDownloadCard,
  SdkworkDownloadPlatform,
  ResolvedSdkworkDownloadCardActions,
} from "./download-types";

function isActionAvailable(action: SdkworkDownloadAction): boolean {
  return !action.disabled && !isBlank(action.href) && action.href.trim() !== "#";
}

export function detectSdkworkDownloadPlatform(userAgent?: string): SdkworkDownloadPlatform {
  const source = userAgent ?? globalThis.navigator?.userAgent ?? "";
  const normalized = source.toLowerCase();

  if (!normalized) {
    return "generic";
  }

  // HarmonyOS first: NEXT UAs carry "OpenHarmony" without "Android", while HarmonyOS 2–4 UAs
  // usually carry both — an Android check first would swallow every Huawei device.
  if (normalized.includes("harmonyos") || normalized.includes("openharmony")) {
    return "harmonyos";
  }

  if (normalized.includes("android")) {
    return "android";
  }

  if (/(iphone|ipad|ipod)/u.test(normalized)) {
    return "ios";
  }

  if (normalized.includes("windows")) {
    return "windows";
  }

  if (normalized.includes("macintosh") || normalized.includes("mac os x")) {
    return "macos";
  }

  if (normalized.includes("linux") || normalized.includes("x11")) {
    return "linux";
  }

  return "generic";
}

export function resolveSdkworkDownloadCardActions(
  card: SdkworkDownloadCard,
  detectedPlatform: SdkworkDownloadPlatform,
): ResolvedSdkworkDownloadCardActions {
  const firstAction = card.actions[0];
  if (!firstAction) {
    throw new Error(`Download card ${card.id} must define at least one action`);
  }

  const explicitPrimary = card.primaryActionId
    ? card.actions.find((action) => action.id === card.primaryActionId)
    : undefined;
  const platformPrimary = card.primaryActionStrategy === "detected-platform"
    ? card.actions.find(
      (action) => action.platform === detectedPlatform && isActionAvailable(action),
    )
    : undefined;
  const firstAvailablePrimary = card.actions.find(isActionAvailable);
  const primaryAction = explicitPrimary ?? platformPrimary ?? firstAvailablePrimary ?? firstAction;

  return {
    primaryAction,
    secondaryActions: card.actions.filter((action) => action.id !== primaryAction.id),
  };
}
