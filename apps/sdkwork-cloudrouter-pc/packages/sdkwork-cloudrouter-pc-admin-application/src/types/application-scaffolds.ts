/** View models for the Deploy app-scaffold catalog inside the App Center. */
export type ApplicationScaffoldStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "REJECTED"
  | "DISABLED";

export type ApplicationScaffoldVisibility = "PUBLIC" | "PRIVATE";
export type ApplicationScaffoldPricingModel = "FREE" | "PAID";
export type ApplicationScaffoldType = "APP" | "PPT" | "VIDEO";
export type ScaffoldCategoryStatus = "ACTIVE" | "DISABLED" | "UNKNOWN";

/** One screenshot in a scaffold listing. */
export interface ApplicationScaffoldScreenshot {
  mediaRef: string;
  device?: string;
  caption?: string;
  sortOrder?: number;
}

/** One app-scaffold listing as the console renders it. */
export interface ApplicationScaffold {
  id: string;
  scaffoldKey: string;
  displayName: string;
  summary: string;
  description: string;
  appUuid: string;
  scaffoldType: ApplicationScaffoldType;
  categoryUuid: string;
  authorUserId: string;
  visibility: ApplicationScaffoldVisibility;
  pricingModel: ApplicationScaffoldPricingModel;
  priceMinor: string;
  currency: string;
  status: ApplicationScaffoldStatus;
  reviewNote?: string;
  isFeatured: boolean;
  installCount: string;
  viewCount: string;
  latestVersionUuid?: string;
  version: string;
  iconMediaRef?: string;
  coverMediaRef?: string;
  screenshots: readonly ApplicationScaffoldScreenshot[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicationScaffoldPage {
  items: readonly ApplicationScaffold[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/** One scaffold taxonomy entry (read via the app API; maintenance stays in Deploy admin). */
export interface ScaffoldCategory {
  id: string;
  categoryKey: string;
  displayName: string;
  description?: string;
  parentId?: string;
  status: ScaffoldCategoryStatus;
  sortOrder?: number;
}

/** One published version snapshot of a scaffold listing. */
export interface ApplicationScaffoldVersion {
  id: string;
  scaffoldUuid: string;
  version: string;
  status: string;
  changelog?: string;
  createdAt?: string;
}

/** A Deploy application that can be published as a scaffold. */
export interface DeployAppOption {
  id: string;
  name: string;
}

/** Editable listing fields shared by create and edit. */
export interface ApplicationScaffoldDraft {
  appUuid: string;
  categoryUuid: string;
  scaffoldKey: string;
  displayName: string;
  summary: string;
  description: string;
  visibility: ApplicationScaffoldVisibility;
  pricingModel: ApplicationScaffoldPricingModel;
  priceMinor: string;
  currency: string;
  iconMediaRef: string;
  coverMediaRef: string;
  /** One screenshot per line: `mediaRef | device? | caption?`. */
  screenshotsText: string;
}

export interface ApplicationScaffoldCreateInput {
  appUuid: string;
  categoryUuid: string;
  scaffoldKey: string;
  displayName: string;
  summary: string;
  description?: string;
  visibility?: ApplicationScaffoldVisibility;
  pricingModel?: ApplicationScaffoldPricingModel;
  priceMinor?: string;
  currency?: string;
  iconMediaRef?: string;
  coverMediaRef?: string;
  screenshots?: readonly ApplicationScaffoldScreenshot[];
}

export interface ApplicationScaffoldUpdateInput {
  displayName?: string;
  summary?: string;
  description?: string;
  categoryUuid?: string;
  visibility?: ApplicationScaffoldVisibility;
  pricingModel?: ApplicationScaffoldPricingModel;
  priceMinor?: string;
  currency?: string;
  iconMediaRef?: string;
  coverMediaRef?: string;
  screenshots?: readonly ApplicationScaffoldScreenshot[];
}

export type ApplicationScaffoldIssueCode =
  | "app-required"
  | "category-required"
  | "scaffold-key-required"
  | "scaffold-key-invalid"
  | "display-name-required"
  | "display-name-too-long"
  | "summary-required"
  | "summary-too-long"
  | "description-too-long"
  | "price-required"
  | "price-invalid"
  | "currency-required"
  | "currency-invalid"
  | "version-required"
  | "version-invalid"
  | "changelog-too-long";

export interface ApplicationScaffoldIssue {
  field: ApplicationScaffoldIssueField;
  code: ApplicationScaffoldIssueCode;
}

export type ApplicationScaffoldIssueField =
  | "appUuid"
  | "categoryUuid"
  | "scaffoldKey"
  | "displayName"
  | "summary"
  | "description"
  | "priceMinor"
  | "currency"
  | "version"
  | "changelog";

/** Result of installing one free, Git-backed scaffold. */
export interface ApplicationScaffoldInstallResult {
  appId: string;
  appName: string;
  scaffoldUuid: string;
}

export interface ApplicationScaffoldService {
  list(input?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: ApplicationScaffoldStatus;
  }): Promise<ApplicationScaffoldPage>;
  /** Applications owned by the caller that can back a new scaffold listing. */
  listApps(): Promise<readonly DeployAppOption[]>;
  listCategories(): Promise<readonly ScaffoldCategory[]>;
  create(input: ApplicationScaffoldCreateInput): Promise<ApplicationScaffold>;
  update(scaffoldId: string, input: ApplicationScaffoldUpdateInput): Promise<ApplicationScaffold>;
  remove(scaffoldId: string): Promise<void>;
  submit(scaffoldId: string): Promise<ApplicationScaffold>;
  listVersions(scaffoldId: string): Promise<readonly ApplicationScaffoldVersion[]>;
  createVersion(
    scaffoldId: string,
    input: { version: string; changelog?: string },
  ): Promise<ApplicationScaffoldVersion>;
  /**
   * Installs a free, Git-backed scaffold as a new application.
   * @param scaffoldId - marketplace listing id.
   * @param input - optional name/slug overrides.
   */
  install(
    scaffoldId: string,
    input?: { name?: string; slug?: string },
  ): Promise<ApplicationScaffoldInstallResult>;
}
