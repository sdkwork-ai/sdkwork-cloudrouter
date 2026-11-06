import {
  getSdkworkAppstoreAppSdkClient,
  getSdkworkDeploymentsAppSdkClient,
  resolveStoredPortalTenantId,
} from "@sdkwork/cloudroutes-pc-commons/runtime";

import type {
  ApplicationCatalogContext,
  ApplicationRecord,
} from "../types/application-catalog";
import { getApplicationCatalogIamService } from "./iam-service";

/**
 * Application source loaders.
 *
 * - IAM: tenant application instances from the IAM backend API (tenant-level,
 *   optionally narrowed to one organization).
 * - Deploy: the deploy app inventory the current tenant session may reach,
 *   narrowed to the organization when the page targets one.
 * - App Store: the current tenant user's App Store library. The store API has
 *   no tenant/administration-wide library read yet, so this group is
 *   tenant-scoped only; organization pages render the scope notice.
 */

const CATALOG_PAGE_SIZE = 200;
const APP_STORE_PAGE_SIZE = 50;

export async function loadIamApplications(
  context: ApplicationCatalogContext,
): Promise<readonly ApplicationRecord[]> {
  const service = getApplicationCatalogIamService();
  const payload = await service.iam.tenantApplications.list(context.tenantId, {
    page: 1,
    page_size: CATALOG_PAGE_SIZE,
  });
  return extractItems(payload)
    .map((item) => mapIamApplication(item))
    .filter((item): item is ApplicationRecord => item !== undefined)
    .filter((item) => matchesOrganization(item, context.organizationId));
}

export async function loadDeployApplications(
  context: ApplicationCatalogContext,
): Promise<readonly ApplicationRecord[]> {
  const client = getSdkworkDeploymentsAppSdkClient();
  const page = await client.app.list({ page: 1, pageSize: CATALOG_PAGE_SIZE });
  return (page.items ?? [])
    .map((item) => mapDeployApplication(item))
    .filter((item): item is ApplicationRecord => item !== undefined)
    .filter((item) => matchesOrganization(item, context.organizationId));
}

export async function loadAppStoreApplications(
  context: ApplicationCatalogContext,
): Promise<readonly ApplicationRecord[]> {
  if (context.organizationId) {
    // The App Store library API is user/tenant scoped and carries no
    // organization dimension; listing it under an organization would mislabel
    // tenant-wide rows as organization apps.
    return [];
  }
  const client = getSdkworkAppstoreAppSdkClient();
  const page = await client.library.appstore.library.items.list({
    pageSize: APP_STORE_PAGE_SIZE,
  });
  return (page.items ?? [])
    .map((item) => mapAppStoreApplication(item))
    .filter((item): item is ApplicationRecord => item !== undefined);
}

/**
 * Resolves the tenant / organization labels shown in the page header.
 * Fetch failures degrade to the raw identifiers instead of blocking the page.
 */
export async function resolveApplicationCatalogContext(input: {
  tenantId?: string;
  organizationId?: string;
}): Promise<ApplicationCatalogContext> {
  const service = getApplicationCatalogIamService();
  if (input.organizationId) {
    try {
      const organization = asRecord(await service.iam.organizations.retrieve(input.organizationId));
      const tenantId = optionalString(organization.tenantId) ?? resolveStoredPortalTenantId() ?? "";
      return {
        organizationId: input.organizationId,
        organizationName: optionalString(organization.name),
        tenantId,
      };
    } catch {
      return {
        organizationId: input.organizationId,
        tenantId: resolveStoredPortalTenantId() ?? "",
      };
    }
  }
  const tenantId = input.tenantId ?? resolveStoredPortalTenantId() ?? "";
  try {
    const tenant = asRecord(await service.iam.tenants.retrieve(tenantId));
    return { tenantId, tenantName: optionalString(tenant.name) };
  } catch {
    return { tenantId };
  }
}

/** `true` when the source is not mounted in this deployment (403/404/501). */
export function isApplicationSourceUnavailable(error: unknown): boolean {
  const record = asRecord(error);
  const status = Number(record.status ?? record.statusCode);
  return status === 403 || status === 404 || status === 501;
}

function mapIamApplication(value: unknown): ApplicationRecord | undefined {
  const record = asRecord(value);
  const id = optionalString(record.tenantApplicationId) ?? optionalString(record.appId);
  if (!id) {
    return undefined;
  }
  return {
    domain: optionalString(record.primaryDomain),
    environment: optionalString(record.environment),
    groupId: "iam",
    id,
    kind: optionalString(record.applicationType),
    name: optionalString(record.displayName) ?? optionalString(record.instanceKey) ?? id,
    organizationId: optionalString(record.organizationId),
    reference: optionalString(record.appId) ?? optionalString(record.instanceKey),
    status: optionalString(record.status),
    updatedAt: optionalString(record.updatedAt),
  };
}

function mapDeployApplication(value: unknown): ApplicationRecord | undefined {
  const record = asRecord(value);
  const id = optionalString(record.id) ?? optionalString(record.slug);
  if (!id) {
    return undefined;
  }
  return {
    environment: optionalString(record.defaultEnvironment),
    groupId: "deploy",
    id,
    kind: optionalString(record.appKind),
    name: optionalString(record.name) ?? optionalString(record.slug) ?? id,
    organizationId: optionalString(record.organizationId),
    reference: optionalString(record.slug),
    status: optionalString(record.appStatus),
    updatedAt: optionalString(record.updatedAt),
  };
}

function mapAppStoreApplication(value: unknown): ApplicationRecord | undefined {
  const record = asRecord(value);
  const id = optionalString(record.id) ?? optionalString(record.appKey);
  if (!id) {
    return undefined;
  }
  return {
    groupId: "app-store",
    id,
    kind: optionalString(record.platform),
    name: optionalString(record.appKey) ?? id,
    reference: optionalString(record.listingId),
    status: optionalString(record.libraryStatus),
    updatedAt: optionalString(record.installedAt),
    version: optionalString(record.installedVersionCode),
  };
}

function matchesOrganization(
  item: ApplicationRecord,
  organizationId: string | undefined,
): boolean {
  if (!organizationId) {
    return true;
  }
  return item.organizationId === organizationId;
}

function extractItems(payload: unknown): readonly unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  const record = asRecord(payload);
  if (Array.isArray(record.items)) {
    return record.items;
  }
  const data = asRecord(record.data);
  return Array.isArray(data.items) ? data.items : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
