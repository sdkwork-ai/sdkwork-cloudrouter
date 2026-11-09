export type SdkworkDownloadTargetKind =
  | "container"
  | "desktop"
  | "documentation"
  | "mobile"
  | "package"
  | "server";

export type SdkworkDownloadPlatform =
  | "android"
  | "docker"
  | "generic"
  | "harmonyos"
  | "helm"
  | "ios"
  | "linux"
  | "macos"
  | "windows";

/** Architectures a catalog can publish, plus `universal` for installers that run on both. */
export type SdkworkDownloadArchitecture = "arm64" | "universal" | "x64";

/**
 * What the browser could prove about the visitor's CPU architecture.
 *
 * `unknown` is a first-class result, not a failure: Safari and Firefox expose no architecture
 * signal on macOS, and guessing wrong is exactly what made an x64 visitor receive an arm64
 * installer. Selection falls back to the safest installable artifact (x64, which runs under
 * emulation on arm64) instead of pretending to know.
 */
export type SdkworkDetectedDownloadArchitecture = SdkworkDownloadArchitecture | "unknown";

export type SdkworkDownloadCardIcon =
  | "desktop"
  | "download"
  | "mobile"
  | "server"
  | "terminal";

export type SdkworkDownloadCardTone =
  | "brand"
  | "mobile"
  | "neutral"
  | "server";

export type SdkworkDownloadPrimaryActionStrategy =
  | "detected-platform"
  | "first-available";

export type SdkworkDownloadSectionVariant =
  | "compact"
  | "hero"
  | "section";

export interface SdkworkDownloadSource {
  ariaLabel?: string;
  disabled?: boolean;
  external?: boolean;
  href: string;
  id: string;
  label: string;
  primary?: boolean;
  unavailableLabel?: string;
}

export interface SdkworkDownloadAction {
  ariaLabel?: string;
  architecture?: string;
  ctaLabel?: string;
  disabled?: boolean;
  external?: boolean;
  fileName?: string;
  href: string;
  id: string;
  kind?: SdkworkDownloadTargetKind;
  label: string;
  platform?: SdkworkDownloadPlatform;
  releaseTag?: string;
  sha256?: string;
  sizeBytes?: number;
  sources?: readonly SdkworkDownloadSource[];
  unavailableLabel?: string;
  version?: string;
}

export interface SdkworkDownloadCard {
  actions: readonly SdkworkDownloadAction[];
  badge?: string;
  description: string;
  icon?: SdkworkDownloadCardIcon;
  id: string;
  kind: SdkworkDownloadTargetKind;
  primaryActionId?: string;
  primaryActionStrategy?: SdkworkDownloadPrimaryActionStrategy;
  title: string;
  tone?: SdkworkDownloadCardTone;
}

export interface ResolvedSdkworkDownloadCardActions {
  primaryAction: SdkworkDownloadAction;
  secondaryActions: SdkworkDownloadAction[];
}

export interface SdkworkDownloadCatalogProduct {
  channel?: string;
  id: string;
  name: string;
  releaseTag?: string;
  releaseUrl?: string;
  version: string;
}

export interface SdkworkDownloadCatalog {
  cards: readonly SdkworkDownloadCard[];
  generatedAt: string;
  product: SdkworkDownloadCatalogProduct;
  schemaVersion: string;
}

export interface SdkworkProductDownloadSectionProps {
  cards?: readonly SdkworkDownloadCard[];
  className?: string;
  catalog?: SdkworkDownloadCatalog;
  detectedArchitecture?: SdkworkDetectedDownloadArchitecture;
  detectedPlatform?: SdkworkDownloadPlatform;
  onDownloadSelect?: (
    action: SdkworkDownloadAction,
    card: SdkworkDownloadCard,
    source?: SdkworkDownloadSource,
  ) => void;
  subtitle?: string;
  title?: string;
  variant?: SdkworkDownloadSectionVariant;
}

export interface SdkworkDownloadCardViewProps {
  card: SdkworkDownloadCard;
  detectedArchitecture?: SdkworkDetectedDownloadArchitecture;
  detectedPlatform: SdkworkDownloadPlatform;
  onDownloadSelect?: SdkworkProductDownloadSectionProps["onDownloadSelect"];
  variant?: SdkworkDownloadSectionVariant;
}
