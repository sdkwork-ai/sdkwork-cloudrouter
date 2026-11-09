import { isBlank } from "@sdkwork/utils/string";
import type {
  SdkworkDetectedDownloadArchitecture,
  SdkworkDownloadAction,
  SdkworkDownloadArchitecture,
  SdkworkDownloadCard,
  SdkworkDownloadPlatform,
  ResolvedSdkworkDownloadCardActions,
} from "./download-types";

function isActionAvailable(action: SdkworkDownloadAction): boolean {
  return !action.disabled && !isBlank(action.href) && action.href.trim() !== "#";
}

/**
 * Canonical architecture token for a catalog action.
 *
 * The catalog is operator-authored JSON, so the same CPU arrives spelled `x64`, `x86_64`,
 * `amd64`, `arm64`, `aarch64`, or `universal`. Matching the raw string would make a correctly
 * configured installer look like it targets a different machine and silently fall through to a
 * sibling architecture — the bug this module exists to prevent.
 */
export function normalizeSdkworkDownloadArchitecture(
  value: string | undefined,
): SdkworkDownloadArchitecture | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (
    normalized === "x64"
    || normalized === "x86_64"
    || normalized === "x86-64"
    || normalized === "amd64"
    || normalized === "win64"
    || normalized === "intel64"
  ) {
    return "x64";
  }
  if (
    normalized === "arm64"
    || normalized === "aarch64"
    || normalized === "arm64e"
    || normalized === "armv8"
    || normalized === "armv8l"
    || normalized === "arm"
    || normalized === "apple-silicon"
    || normalized === "apple silicon"
  ) {
    return "arm64";
  }
  if (
    normalized === "universal"
    || normalized === "universal2"
    || normalized === "fat"
    || normalized === "any"
    || normalized === "all"
  ) {
    return "universal";
  }
  return undefined;
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

const ARM64_USER_AGENT = /(?:arm64|aarch64|armv8|arm64e)/u;
const X64_USER_AGENT = /(?:x86[_-]64|x64|amd64|win64|wow64)/u;

/**
 * Best-effort CPU architecture from the user-agent string alone.
 *
 * Only evidence a browser actually states is used. macOS is deliberately left `unknown` on
 * Safari/Firefox: the macOS UA still claims `Intel Mac OS X` on Apple silicon, so deriving x64
 * from it would hand an M-series visitor the Intel package. Chromium's structured User-Agent
 * Client Hints (`detectSdkworkDownloadTarget` below) fills that gap; when no hint is available
 * the selector prefers x64, which runs under Rosetta/Prism emulation on arm64 machines.
 */
export function detectSdkworkDownloadArchitecture(
  userAgent?: string,
): SdkworkDetectedDownloadArchitecture {
  const source = userAgent ?? globalThis.navigator?.userAgent ?? "";
  const normalized = source.toLowerCase();
  if (!normalized) {
    return "unknown";
  }

  const platform = detectSdkworkDownloadPlatform(normalized);

  if (platform === "ios") {
    return "arm64";
  }

  if (platform === "harmonyos") {
    return "arm64";
  }

  if (platform === "windows") {
    if (ARM64_USER_AGENT.test(normalized) || /\barm\b/u.test(normalized)) {
      return "arm64";
    }
    return X64_USER_AGENT.test(normalized) ? "x64" : "unknown";
  }

  if (platform === "linux") {
    if (ARM64_USER_AGENT.test(normalized)) {
      return "arm64";
    }
    return X64_USER_AGENT.test(normalized) ? "x64" : "unknown";
  }

  if (platform === "android") {
    if (X64_USER_AGENT.test(normalized)) {
      return "x64";
    }
    return ARM64_USER_AGENT.test(normalized) ? "arm64" : "unknown";
  }

  // macOS: the UA always says "Intel", regardless of the CPU actually installed.
  if (platform === "macos") {
    return ARM64_USER_AGENT.test(normalized) ? "arm64" : "unknown";
  }

  return "unknown";
}

/** The subset of `Navigator` this module reads, so tests can provide a plain object. */
export interface SdkworkNavigatorLike {
  userAgent?: string;
  userAgentData?: {
    getHighEntropyValues?: (
      hints: readonly string[],
    ) => Promise<{ architecture?: string; bitness?: string } | undefined>;
  };
}

export interface SdkworkDetectedDownloadTarget {
  architecture: SdkworkDetectedDownloadArchitecture;
  platform: SdkworkDownloadPlatform;
}

function architectureFromHighEntropy(
  values: { architecture?: string; bitness?: string } | undefined,
): SdkworkDownloadArchitecture | undefined {
  const architecture = values?.architecture?.trim().toLowerCase();
  if (!architecture) {
    return undefined;
  }
  if (architecture.includes("arm")) {
    return "arm64";
  }
  if (
    architecture.includes("x86")
    || architecture.includes("x64")
    || architecture.includes("amd64")
  ) {
    // A 32-bit browser cannot install an x64 package reliably; treat it as unknown.
    return values?.bitness?.trim() === "32" ? undefined : "x64";
  }
  if (architecture.includes("universal")) {
    return "universal";
  }
  return undefined;
}

async function readHighEntropyArchitecture(
  navigatorLike: SdkworkNavigatorLike | undefined,
  timeoutMs: number,
): Promise<SdkworkDownloadArchitecture | undefined> {
  const reader = navigatorLike?.userAgentData?.getHighEntropyValues;
  if (typeof reader !== "function") {
    return undefined;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), timeoutMs);
  });
  try {
    const values = await Promise.race([
      reader.call(navigatorLike?.userAgentData, ["architecture", "bitness"]),
      timeout,
    ]);
    return architectureFromHighEntropy(values);
  } catch {
    // A denied or unsupported hint is not an error: the UA fallback still runs.
    return undefined;
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/**
 * Detects the visitor's platform **and** CPU architecture.
 *
 * Chromium exposes the real architecture through User-Agent Client Hints — the only reliable
 * signal on Windows-on-ARM and Apple silicon — and is preferred over the legacy UA string. The
 * result is bounded by `timeoutMs` so a browser that never answers the hint cannot delay the
 * download section indefinitely.
 */
export async function detectSdkworkDownloadTarget(
  navigatorLike: SdkworkNavigatorLike | undefined = globalThis.navigator as
    | SdkworkNavigatorLike
    | undefined,
  timeoutMs = 500,
): Promise<SdkworkDetectedDownloadTarget> {
  const userAgent = navigatorLike?.userAgent;
  const platform = detectSdkworkDownloadPlatform(userAgent);
  const hinted = await readHighEntropyArchitecture(navigatorLike, timeoutMs);
  return {
    architecture: hinted ?? detectSdkworkDownloadArchitecture(userAgent),
    platform,
  };
}

/**
 * How well an action's architecture fits the visitor. Lower is better.
 *
 * Ties keep catalog order, so an operator's ordering still decides between two equally suitable
 * installers.
 */
function architectureRank(
  architecture: string | undefined,
  detectedArchitecture: SdkworkDetectedDownloadArchitecture,
): number {
  const normalized = normalizeSdkworkDownloadArchitecture(architecture);

  if (detectedArchitecture === "unknown") {
    // No signal: prefer a universal package, then the x64 build (it runs under emulation on
    // arm64), then an unlabelled package, and only then an arm64-only build.
    if (normalized === "universal") return 0;
    if (normalized === "x64") return 1;
    if (normalized === undefined) return 2;
    return 3;
  }

  if (normalized === detectedArchitecture) return 0;
  if (normalized === "universal") return 1;
  if (normalized === undefined) return 2;
  return 3;
}

function pickBestArchitectureAction(
  actions: readonly SdkworkDownloadAction[],
  detectedArchitecture: SdkworkDetectedDownloadArchitecture,
): SdkworkDownloadAction {
  let best = actions[0];
  let bestRank = architectureRank(best.architecture, detectedArchitecture);
  for (const action of actions.slice(1)) {
    const rank = architectureRank(action.architecture, detectedArchitecture);
    if (rank < bestRank) {
      best = action;
      bestRank = rank;
    }
  }
  return best;
}

/**
 * Picks the primary installer from one platform's rows.
 *
 * A row published for the visitor's exact CPU wins whenever it is usable. When it is parked
 * ("coming soon"), a working universal package is preferred because it installs on that machine
 * today; without one the parked row stays primary instead of silently offering the other
 * architecture. That is the difference between "we do not have an x64 build yet" and handing an
 * x64 visitor the arm64 installer — the bug this function exists to prevent.
 */
function selectPlatformAction(
  platformActions: readonly SdkworkDownloadAction[],
  detectedArchitecture: SdkworkDetectedDownloadArchitecture,
): SdkworkDownloadAction {
  const exact = detectedArchitecture !== "unknown"
    ? platformActions.find(
      (action) => normalizeSdkworkDownloadArchitecture(action.architecture) === detectedArchitecture,
    )
    : undefined;
  if (exact && isActionAvailable(exact)) {
    return exact;
  }

  // A working universal package beats a parked exact-architecture row: it is installable on the
  // visitor's machine today. Without one, the parked row is still the honest answer.
  const availableUniversal = platformActions.find(
    (action) =>
      normalizeSdkworkDownloadArchitecture(action.architecture) === "universal"
      && isActionAvailable(action),
  );
  if (availableUniversal) {
    return availableUniversal;
  }

  if (exact) {
    return exact;
  }

  const universal = platformActions.find(
    (action) => normalizeSdkworkDownloadArchitecture(action.architecture) === "universal",
  );
  if (universal) {
    return universal;
  }

  const available = platformActions.filter(isActionAvailable);
  if (available.length > 0) {
    return pickBestArchitectureAction(available, detectedArchitecture);
  }

  return pickBestArchitectureAction(platformActions, detectedArchitecture);
}

export function resolveSdkworkDownloadCardActions(
  card: SdkworkDownloadCard,
  detectedPlatform: SdkworkDownloadPlatform,
  detectedArchitecture: SdkworkDetectedDownloadArchitecture = "unknown",
): ResolvedSdkworkDownloadCardActions {
  const firstAction = card.actions[0];
  if (!firstAction) {
    throw new Error(`Download card ${card.id} must define at least one action`);
  }

  const explicitPrimary = card.primaryActionId
    ? card.actions.find((action) => action.id === card.primaryActionId)
    : undefined;
  const platformActions = card.actions.filter(
    (action) => action.platform === detectedPlatform,
  );
  // Only a card that opted into platform matching selects the visitor's installer. An explicit
  // primary still wins while it is available, so the server card keeps its "Get Server Edition"
  // button; when that explicit choice is unavailable the card falls through to the visitor's
  // platform instead of rendering a dead button over a working download.
  const platformPrimary = card.primaryActionStrategy === "detected-platform"
    && platformActions.length > 0
    ? selectPlatformAction(platformActions, detectedArchitecture)
    : undefined;
  const platformFallback = platformActions.length > 0
    ? selectPlatformAction(platformActions, detectedArchitecture)
    : undefined;
  const firstAvailablePrimary = card.actions.find(isActionAvailable);
  const primaryAction =
    (explicitPrimary && isActionAvailable(explicitPrimary) ? explicitPrimary : undefined)
    ?? platformPrimary
    ?? firstAvailablePrimary
    ?? explicitPrimary
    ?? platformFallback
    ?? firstAction;

  return {
    primaryAction,
    secondaryActions: card.actions.filter((action) => action.id !== primaryAction.id),
  };
}
