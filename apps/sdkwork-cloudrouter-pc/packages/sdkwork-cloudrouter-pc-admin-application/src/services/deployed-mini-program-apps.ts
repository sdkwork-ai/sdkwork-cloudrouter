/**
 * Deployed mini program applications offered to the official-account menu editor.
 *
 * The WeChat "open mini program" menu action needs a mini program AppID. The
 * application center already links every Deploy application to one IAM
 * `mini_program` resource account per environment, stored under
 * `deploy_app.metadata.integrations` (see `application-integration-document`).
 * This service reads that inventory through the generated Deploy app SDK and
 * projects it into the rows the IAM custom-menu editor renders, so an operator
 * picks a deployed application instead of retyping an AppID the application
 * center already knows.
 *
 * The projection is split from the transport so the menu-editor contract can be
 * tested without an SDK client or a network.
 */

import { getSdkworkDeploymentsAppSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

import { readApplicationIntegrationDocument } from "./application-integration-document";

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
  const rows: DeployedMiniProgramApp[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= DEPLOY_APP_MAX_PAGES; page += 1) {
    const response = await client.app.list({ page, pageSize: DEPLOY_APP_PAGE_SIZE });
    for (const item of response.items ?? []) {
      for (const row of toDeployedMiniProgramApps(item)) {
        const key = `${row.id}\u0000${row.appId ?? ""}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        rows.push(row);
      }
    }
    const totalPages = response.pageInfo?.totalPages;
    if (response.items?.length !== DEPLOY_APP_PAGE_SIZE
      || typeof totalPages !== "number"
      || page >= totalPages) {
      break;
    }
  }
  return rows;
}

/**
 * Projects one Deploy app record into picker rows.
 *
 * Exported for contract tests; `loadDeployedMiniProgramApps` is the transport
 * entry point used by hosts.
 */
export function toDeployedMiniProgramApps(value: unknown): readonly DeployedMiniProgramApp[] {
  const record = asRecord(value);
  const id = readString(record.id) ?? readString(record.uuid) ?? readString(record.slug);
  if (!id) {
    return [];
  }
  if ((readString(record.appKind) ?? readString(record.app_kind) ?? "").toUpperCase() !== WECHAT_MINI_PROGRAM_APP_KIND) {
    return [];
  }
  const status = readString(record.appStatus) ?? readString(record.app_status);
  if ((status ?? "").toUpperCase() === ARCHIVED_APP_STATUS) {
    return [];
  }
  const slug = readString(record.slug);
  const base: DeployedMiniProgramApp = {
    id,
    name: readString(record.name) ?? slug ?? id,
    ...(slug === undefined ? {} : { reference: slug }),
    ...(status === undefined ? {} : { status }),
  };
  const document = readApplicationIntegrationDocument(record.metadata);
  const rows: DeployedMiniProgramApp[] = [];
  const seenAppIds = new Set<string>();
  for (const [environment, integration] of Object.entries(document.environments)) {
    const binding = integration.miniProgram;
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
