/**
 * Deployed mini program applications offered to the official-account menu editor.
 *
 * The WeChat "open mini program" menu action needs a mini program AppID.
 * Account bindings are owned by `deploy_application_resource_link`: the
 * application center writes one mini program row per (application,
 * environment). This service reads that authority through the generated Deploy
 * app SDK and projects it into the rows the IAM custom-menu editor renders, so
 * an operator picks a deployed application instead of retyping an AppID the
 * application center already knows.
 *
 * The pre-migration `deploy_app.metadata.integrations` document is still read as
 * a fallback seed for applications whose rows have not been migrated yet. The
 * authority wins whenever it has a row for an environment.
 *
 * The projection is split from the transport so the menu-editor contract can be
 * tested without an SDK client or a network.
 */

import { getSdkworkDeploymentsAppSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

import type { ApplicationResourceLinkRecord } from "../types/application-integrations";
import {
  environmentIntegrationsFromResourceLinks,
  mapApplicationResourceLink,
  readApplicationIntegrationDocument,
} from "./application-integration-document";

/** One pickable row of the custom-menu "select from deployed apps" dialog. */
export interface DeployedMiniProgramApp {
  /** Deploy application identity (`deploy_app.uuid`). */
  id: string;
  /** Deploy application display name. */
  name: string;
  /** Secondary identifier: the deploy application slug. */
  reference?: string;
  /** Deploy application lifecycle status (`ACTIVE`, `PAUSED`, ...). */
  status?: string;
  /**
   * Deploy environment whose integration document carries the linked account.
   * Absent when the application links no mini program account at all.
   */
  environment?: string;
  /**
   * AppID of the mini program account linked to the Deploy application. Absent
   * when the application links no account, which makes the row unselectable.
   */
  appId?: string;
  /** Display name of the linked mini program account. */
  accountName?: string;
}

/** Page size and page ceiling of one picker inventory load. */
const DEPLOY_APP_PAGE_SIZE = 200;
/**
 * Upper bound on pages one inventory load follows.
 *
 * The generated Deploy SDK exposes offset pages, not a full collection read.
 * Five full pages cover every realistic tenant inventory, and a pathological
 * cursor/id echo cannot turn one open dialog into an unbounded request loop.
 */
const DEPLOY_APP_MAX_PAGES = 5;

/** WeChat mini program application kind (`AppKind`); other kinds cannot open in WeChat. */
const WECHAT_MINI_PROGRAM_APP_KIND = "WECHAT_MINIPROGRAM";

/** Application status of a removed app; it is not offered for a new menu. */
const ARCHIVED_APP_STATUS = "ARCHIVED";

/**
 * Upper bound on applications whose authoritative bindings are read.
 *
 * `deploy_application_resource_link` is listed per application, so the
 * inventory needs one read per WeChat mini program application. The menu editor
 * is a picker, not an audit: this bound keeps one dialog open from fanning out
 * without limit, and applications beyond it still appear with their legacy
 * seed. Realistic tenants are far below the bound.
 */
const RESOURCE_LINK_CANDIDATE_LIMIT = 120;
/** Parallel link reads per batch. */
const RESOURCE_LINK_BATCH_SIZE = 8;
/** Resource-link rows are small; 200 per page covers every realistic app. */
const RESOURCE_LINK_PAGE_SIZE = 200;
/** Hard bound on one application's link page walk. */
const RESOURCE_LINK_MAX_PAGES = 20;

/**
 * Loads the tenant's deployed WeChat mini program applications.
 *
 * Every row is one Deploy application plus, when the application center linked
 * it, the AppID of the associated mini program account. An application that
 * links accounts in several environments contributes one row per distinct
 * AppID so the operator can choose the right environment; an application with
 * no linked account contributes one unselectable row so the inventory still
 * shows it exists.
 */
export async function loadDeployedMiniProgramApps(): Promise<readonly DeployedMiniProgramApp[]> {
  const client = getSdkworkDeploymentsAppSdkClient();
  const candidates: Record<string, unknown>[] = [];
  for (let page = 1; page <= DEPLOY_APP_MAX_PAGES; page += 1) {
    const response = await client.app.list({ page, pageSize: DEPLOY_APP_PAGE_SIZE });
    for (const item of response.items ?? []) {
      const record = asRecord(item);
      if (!isMiniProgramAppRecord(record)) {
        continue;
      }
      candidates.push(record);
    }
    const totalPages = response.pageInfo?.totalPages;
    if (response.items?.length !== DEPLOY_APP_PAGE_SIZE
      || typeof totalPages !== "number"
      || page >= totalPages) {
      break;
    }
  }
  const linksByApp = await loadResourceLinks(client, candidates);
  const rows: DeployedMiniProgramApp[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const id = readString(candidate.id) ?? readString(candidate.uuid) ?? readString(candidate.slug) ?? "";
    for (const row of toDeployedMiniProgramApps(candidate, linksByApp.get(id))) {
      const key = `${row.id}\u0000${row.appId ?? ""}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      rows.push(row);
    }
  }
  return rows;
}

/**
 * Reads every candidate application's authoritative binding rows.
 *
 * A failed read falls back to the legacy seed for that application instead of
 * dropping it from the picker; the row then shows without an AppID and stays
 * unselectable, which is the same state as "not linked yet".
 */
async function loadResourceLinks(
  client: ReturnType<typeof getSdkworkDeploymentsAppSdkClient>,
  candidates: readonly Record<string, unknown>[],
): Promise<Map<string, readonly ApplicationResourceLinkRecord[]>> {
  const linksByApp = new Map<string, readonly ApplicationResourceLinkRecord[]>();
  const readable = candidates.slice(0, RESOURCE_LINK_CANDIDATE_LIMIT);
  for (let start = 0; start < readable.length; start += RESOURCE_LINK_BATCH_SIZE) {
    const batch = readable.slice(start, start + RESOURCE_LINK_BATCH_SIZE);
    const results = await Promise.all(batch.map(async (candidate) => {
      const id = readString(candidate.id) ?? readString(candidate.uuid) ?? readString(candidate.slug);
      if (!id) {
        return undefined;
      }
      try {
        return [id, await listLinksForApp(client, id)] as const;
      } catch {
        return [id, [] as ApplicationResourceLinkRecord[]] as const;
      }
    }));
    for (const result of results) {
      if (result) {
        linksByApp.set(result[0], result[1]);
      }
    }
  }
  return linksByApp;
}

/** Reads every authoritative binding row of one application (bounded walk). */
async function listLinksForApp(
  client: ReturnType<typeof getSdkworkDeploymentsAppSdkClient>,
  deployAppId: string,
): Promise<readonly ApplicationResourceLinkRecord[]> {
  const links: ApplicationResourceLinkRecord[] = [];
  for (let page = 1; page <= RESOURCE_LINK_MAX_PAGES; page += 1) {
    const result = await client.app.resourceLinks.list(deployAppId, {
      page,
      pageSize: RESOURCE_LINK_PAGE_SIZE,
    });
    for (const item of result.items ?? []) {
      const link = mapApplicationResourceLink(item);
      if (link) {
        links.push(link);
      }
    }
    if (!result.pageInfo?.hasMore) {
      break;
    }
  }
  return links;
}

/**
 * Projects one Deploy app record into picker rows.
 *
 * `links` is the authoritative `deploy_application_resource_link` inventory for
 * the application. When it is absent (legacy callers, failed read, unit tests)
 * only the pre-migration metadata document is read.
 *
 * Exported for contract tests; `loadDeployedMiniProgramApps` is the transport
 * entry point used by hosts.
 */
export function toDeployedMiniProgramApps(
  value: unknown,
  links?: readonly ApplicationResourceLinkRecord[],
): readonly DeployedMiniProgramApp[] {
  const record = asRecord(value);
  const id = readString(record.id) ?? readString(record.uuid) ?? readString(record.slug);
  if (!id) {
    return [];
  }
  if (!isMiniProgramAppRecord(record)) {
    return [];
  }
  const status = readString(record.appStatus) ?? readString(record.app_status);
  const slug = readString(record.slug);
  const base: DeployedMiniProgramApp = {
    id,
    name: readString(record.name) ?? slug ?? id,
    ...(slug === undefined ? {} : { reference: slug }),
    ...(status === undefined ? {} : { status }),
  };
  const legacy = readApplicationIntegrationDocument(record.metadata).environments;
  const authority = environmentIntegrationsFromResourceLinks(links ?? []);
  const environmentKeys = [...new Set([...Object.keys(legacy), ...Object.keys(authority)])];
  const rows: DeployedMiniProgramApp[] = [];
  const seenAppIds = new Set<string>();
  for (const environment of environmentKeys) {
    const binding = authority[environment]?.miniProgram ?? legacy[environment]?.miniProgram;
    const appId = binding?.appId.trim();
    if (binding === undefined || !appId || seenAppIds.has(appId)) {
      continue;
    }
    seenAppIds.add(appId);
    const accountName = binding.displayName.trim();
    rows.push({
      ...base,
      environment,
      appId,
      ...(accountName === "" ? {} : { accountName }),
    });
  }
  return rows.length === 0 ? [base] : rows;
}

/** `true` when a Deploy row is an active WeChat mini program application. */
function isMiniProgramAppRecord(record: Record<string, unknown>): boolean {
  if ((readString(record.appKind) ?? readString(record.app_kind) ?? "").toUpperCase()
    !== WECHAT_MINI_PROGRAM_APP_KIND) {
    return false;
  }
  const status = readString(record.appStatus) ?? readString(record.app_status);
  return (status ?? "").toUpperCase() !== ARCHIVED_APP_STATUS;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
