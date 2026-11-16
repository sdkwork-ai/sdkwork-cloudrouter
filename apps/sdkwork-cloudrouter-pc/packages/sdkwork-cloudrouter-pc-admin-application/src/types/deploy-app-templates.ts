/** View models for the Deploy app-template catalog inside the App Center. */
export type DeployAppTemplateStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "REJECTED"
  | "DISABLED";

export type DeployAppTemplateVisibility = "PUBLIC" | "PRIVATE";
export type DeployAppTemplatePricingModel = "FREE" | "PAID";
export type DeployAppTemplateType = "APP" | "PPT" | "VIDEO";
export type DeployTemplateCategoryStatus = "ACTIVE" | "DISABLED" | "UNKNOWN";

/** One screenshot in a template listing. */
export interface DeployAppTemplateScreenshot {
  mediaRef: string;
  device?: string;
  caption?: string;
  sortOrder?: number;
}

/** One app-template listing as the console renders it. */
export interface DeployAppTemplate {
  id: string;
  templateKey: string;
  displayName: string;
  summary: string;
  description: string;
  appUuid: string;
  templateType: DeployAppTemplateType;
  categoryUuid: string;
  authorUserId: string;
  visibility: DeployAppTemplateVisibility;
  pricingModel: DeployAppTemplatePricingModel;
  priceMinor: string;
  currency: string;
  status: DeployAppTemplateStatus;
  reviewNote?: string;
  isFeatured: boolean;
  installCount: string;
  viewCount: string;
  latestVersionUuid?: string;
  version: string;
  iconMediaRef?: string;
  coverMediaRef?: string;
  screenshots: readonly DeployAppTemplateScreenshot[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DeployAppTemplatePage {
  items: readonly DeployAppTemplate[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/** One template taxonomy entry (read via the app API; maintenance stays in Deploy admin). */
export interface DeployAppTemplateCategory {
  id: string;
  categoryKey: string;
  displayName: string;
  description?: string;
  parentId?: string;
  status: DeployTemplateCategoryStatus;
  sortOrder?: number;
}

/** One published version snapshot of a template listing. */
export interface DeployAppTemplateVersion {
  id: string;
  templateUuid: string;
  version: string;
  status: string;
  changelog?: string;
  createdAt?: string;
}

/** A Deploy application that can be published as a template. */
export interface DeployAppOption {
  id: string;
  name: string;
}

/** Editable listing fields shared by create and edit. */
export interface DeployAppTemplateDraft {
  appUuid: string;
  categoryUuid: string;
  templateKey: string;
  displayName: string;
  summary: string;
  description: string;
  visibility: DeployAppTemplateVisibility;
  pricingModel: DeployAppTemplatePricingModel;
  priceMinor: string;
  currency: string;
  iconMediaRef: string;
  coverMediaRef: string;
  /** One screenshot per line: `mediaRef | device? | caption?`. */
  screenshotsText: string;
}

export interface DeployAppTemplateCreateInput {
  appUuid: string;
  categoryUuid: string;
  templateKey: string;
  displayName: string;
  summary: string;
  description?: string;
  visibility?: DeployAppTemplateVisibility;
  pricingModel?: DeployAppTemplatePricingModel;
  priceMinor?: string;
  currency?: string;
  iconMediaRef?: string;
  coverMediaRef?: string;
  screenshots?: readonly DeployAppTemplateScreenshot[];
}

export interface DeployAppTemplateUpdateInput {
  displayName?: string;
  summary?: string;
  description?: string;
  categoryUuid?: string;
  visibility?: DeployAppTemplateVisibility;
  pricingModel?: DeployAppTemplatePricingModel;
  priceMinor?: string;
  currency?: string;
  iconMediaRef?: string;
  coverMediaRef?: string;
  screenshots?: readonly DeployAppTemplateScreenshot[];
}

export type DeployAppTemplateIssueCode =
  | "app-required"
  | "category-required"
  | "template-key-required"
  | "template-key-invalid"
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

export interface DeployAppTemplateIssue {
  field: DeployAppTemplateIssueField;
  code: DeployAppTemplateIssueCode;
}

export type DeployAppTemplateIssueField =
  | "appUuid"
  | "categoryUuid"
  | "templateKey"
  | "displayName"
  | "summary"
  | "description"
  | "priceMinor"
  | "currency"
  | "version"
  | "changelog";

export interface DeployAppTemplateService {
  list(input?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: DeployAppTemplateStatus;
  }): Promise<DeployAppTemplatePage>;
  /** Applications owned by the caller that can back a new template listing. */
  listApps(): Promise<readonly DeployAppOption[]>;
  listCategories(): Promise<readonly DeployAppTemplateCategory[]>;
  create(input: DeployAppTemplateCreateInput): Promise<DeployAppTemplate>;
  update(templateId: string, input: DeployAppTemplateUpdateInput): Promise<DeployAppTemplate>;
  remove(templateId: string): Promise<void>;
  submit(templateId: string): Promise<DeployAppTemplate>;
  listVersions(templateId: string): Promise<readonly DeployAppTemplateVersion[]>;
  createVersion(
    templateId: string,
    input: { version: string; changelog?: string },
  ): Promise<DeployAppTemplateVersion>;
}
