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
  | "helm"
  | "ios"
  | "linux"
  | "macos"
  | "windows";

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
  detectedPlatform: SdkworkDownloadPlatform;
  onDownloadSelect?: SdkworkProductDownloadSectionProps["onDownloadSelect"];
  variant?: SdkworkDownloadSectionVariant;
}
