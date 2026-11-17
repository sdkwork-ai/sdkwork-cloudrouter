import { getSdkworkDeploymentsAppSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

import type {
  DeployAppRemixState,
  DeployAppSourceArchive,
  DeployAppSourceGit,
  DeployAppSourceKind,
  DeployAppSourceReadiness,
  DeployAppSourceReadinessReason,
  DeployAppSourceService,
  DeployAppSourceSnapshot,
  DeployAppSourceState,
  DeployAppSourceUpdatePayload,
  DeployArtifactOption,
} from "../types/deploy-app-source";
import { DEPLOY_APP_SOURCE_READINESS_REASONS } from "../types/deploy-app-source";

/**
 * Deploy app source / remix transport seam.
 *
 * Declared structurally so tests can pass a recorder while the default
 * implementation uses the generated `@sdkwork/deployments-app-sdk` client the
 * Cloud Router runtime already provides. Operation names come from
 * `sdks/_route-manifests/app-api/sdkwork-routes-deploy-app-api.route-manifest.json`:
 *
 * - `apps.source.retrieve|update|delete` (`deploy.apps.read|write`);
 * - `apps.remix.retrieve|update` (`deploy.apps.read|write`);
 * - `artifacts.list` (`deploy.artifacts.read`) — read only, to pick an existing
 *   archive; this surface never registers or retires an artifact.
 */
export interface DeployAppSourceTransport {
  app: {
    source: {
      retrieve(appId: string): Promise<unknown>;
      update(appId: string, body: DeployAppSourceUpdatePayload): Promise<unknown>;
      delete(appId: string): Promise<void>;
    };
    remix: {
      retrieve(appId: string): Promise<unknown>;
      update(appId: string, body: { enabled: boolean }): Promise<unknown>;
    };
  };
  artifact: {
    list(params?: { page?: number; pageSize?: number }): Promise<unknown>;
  };
}

export type DeployAppSourceErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "validation"
  | "unavailable"
  | "network"
  | "unknown";

/**
 * Normalized failure the source drawer switches on.
 *
 * `reason` carries the readiness code a `409` refusal was built from
 * (`remix cannot be enabled: … (GIT_REPOSITORY_NOT_VALIDATED)`), so the drawer can
 * explain the refusal in the operator's words instead of echoing a server string.
 */
export class DeployAppSourceServiceError extends Error {
  readonly kind: DeployAppSourceErrorKind;
  readonly status?: number;
  readonly reason?: DeployAppSourceReadinessReason;

  constructor(
    kind: DeployAppSourceErrorKind,
    message: string,
    status?: number,
    reason?: DeployAppSourceReadinessReason,
  ) {
    super(message);
    this.name = "DeployAppSourceServiceError";
    this.kind = kind;
    if (status !== undefined) {
      this.status = status;
    }
    if (reason !== undefined) {
      this.reason = reason;
    }
  }
}

const ARTIFACT_PAGE_SIZE = 100;

/** Build the source operations on top of one transport. */
export function createDeployAppSourceService(
  transport: DeployAppSourceTransport,
): DeployAppSourceService {
  const sourceApi = transport.app.source;
  const remixApi = transport.app.remix;

  return {
    async load(appId) {
      const [sourcePayload, remixPayload] = await Promise.all([
        call("source.retrieve", () => sourceApi.retrieve(appId)),
        // The remix read is advisory. An installation that serves `/source` but
        // not `/remix` must still render the source form, so its failure degrades
        // to the flag the source response already carries.
        remixApi.retrieve(appId).catch(() => undefined),
      ]);
      const source = mapSourceState(sourcePayload, appId);
      if (!source) {
        throw new DeployAppSourceServiceError("unknown", "app source response is empty");
      }
      const remix = mapRemixState(remixPayload, appId);
      return {
        source: { ...source, remixEnabled: remix?.remixEnabled ?? source.remixEnabled },
        remix: remix ?? remixFromSource(source),
      };
    },

    async save(appId, payload) {
      const result = await call("source.update", () => sourceApi.update(appId, payload));
      const source = mapSourceState(result, appId);
      if (!source) {
        throw new DeployAppSourceServiceError("unknown", "app source response is empty");
      }
      return source;
    },

    async retire(appId) {
      await call("source.delete", () => sourceApi.delete(appId));
    },

    async setRemix(appId, enabled) {
      const result = await call("remix.update", () => remixApi.update(appId, { enabled }));
      const remix = mapRemixState(result, appId);
      if (!remix) {
        throw new DeployAppSourceServiceError("unknown", "app remix response is empty");
      }
      return remix;
    },

    async listArtifacts() {
      const payload = await call("artifact.list", () =>
        transport.artifact.list({ page: 1, pageSize: ARTIFACT_PAGE_SIZE }));
      return readItems(payload)
        .map(mapArtifact)
        .filter((artifact): artifact is DeployArtifactOption => artifact !== undefined);
    },
  };
}

let defaultService: DeployAppSourceService | null = null;

/** Shared source service backed by the generated Deploy app SDK. */
export function getDeployAppSourceService(): DeployAppSourceService {
  if (!defaultService) {
    defaultService = createDeployAppSourceService(getSdkworkDeploymentsAppSdkClient());
  }
  return defaultService;
}

export function resetDeployAppSourceService(): void {
  defaultService = null;
}

/**
 * Normalize any thrown value into the failure the UI explains.
 *
 * The service already normalizes its own operations; this entry point exists for
 * a seam (or a future transport) that rejects with a raw SdkError, so the drawer
 * never has to guess which `is*` predicate applies.
 */
export function classifyDeployAppSourceError(error: unknown): DeployAppSourceServiceError {
  return normalizeError("request", error);
}

export function isDeployAppSourceUnauthorized(error: unknown): boolean {
  return errorKind(error) === "unauthorized";
}

export function isDeployAppSourceForbidden(error: unknown): boolean {
  const kind = errorKind(error);
  return kind === "forbidden" || kind === "unauthorized";
}

export function isDeployAppSourceNotFound(error: unknown): boolean {
  return errorKind(error) === "not-found";
}

export function isDeployAppSourceConflict(error: unknown): boolean {
  return errorKind(error) === "conflict";
}

export function isDeployAppSourceUnavailable(error: unknown): boolean {
  return errorKind(error) === "unavailable";
}

export function isDeployAppSourceNetworkFailure(error: unknown): boolean {
  return errorKind(error) === "network";
}

/**
 * The readiness reason a refusal was built from, when the server stated one.
 *
 * `409` responses carry the code inside the problem detail text
 * (`… is MISSING (SOURCE_NOT_CONFIGURED)`), so the message is scanned for the
 * closed set of codes the backend can emit rather than for a field the wire
 * contract does not promise.
 */
export function deployAppSourceErrorReason(
  error: unknown,
): DeployAppSourceReadinessReason | undefined {
  if (error instanceof DeployAppSourceServiceError) {
    return error.reason;
  }
  return extractReadinessReason(errorMessage(error));
}

export function mapSourceState(value: unknown, fallbackAppId = ""): DeployAppSourceState | undefined {
  const record = asRecord(unwrapItem(value));
  if (Object.keys(record).length === 0) {
    return undefined;
  }
  const appId = readString(record, "appId") || fallbackAppId;
  if (!appId) {
    return undefined;
  }
  const readiness = readReadiness(record);
  const reason = readReadinessReason(record);
  const git = mapGit(record.git);
  const archive = mapArchive(record.archive);
  const sourceKind = readSourceKind(record.sourceKind);
  return {
    appId,
    readiness,
    remixEnabled: readBoolean(record, "remixEnabled") ?? false,
    ...(sourceKind ? { sourceKind } : {}),
    ...(readiness === "MISSING" && reason ? { readinessReason: reason } : {}),
    ...(git ? { git } : {}),
    ...(archive ? { archive } : {}),
    ...(readString(record, "updatedAt") ? { updatedAt: readString(record, "updatedAt") } : {}),
    ...(readString(record, "version") ? { version: readString(record, "version") } : {}),
  };
}

export function mapRemixState(value: unknown, fallbackAppId = ""): DeployAppRemixState | undefined {
  const record = asRecord(unwrapItem(value));
  if (Object.keys(record).length === 0) {
    return undefined;
  }
  const appId = readString(record, "appId") || fallbackAppId;
  if (!appId) {
    return undefined;
  }
  const readiness = readReadiness(record);
  const reason = readReadinessReason(record);
  const sourceKind = readSourceKind(record.sourceKind);
  return {
    appId,
    readiness,
    remixEnabled: readBoolean(record, "remixEnabled") ?? false,
    ...(sourceKind ? { sourceKind } : {}),
    ...(readiness === "MISSING" && reason ? { readinessReason: reason } : {}),
    ...(readString(record, "updatedAt") ? { updatedAt: readString(record, "updatedAt") } : {}),
    ...(readString(record, "version") ? { version: readString(record, "version") } : {}),
  };
}

export function mapArtifact(value: unknown): DeployArtifactOption | undefined {
  const record = asRecord(value);
  const id = readString(record, "id", "artifactId");
  if (!id) {
    return undefined;
  }
  return {
    id,
    fileName: readString(record, "fileName") || id,
    ...(readString(record, "contentLength") ? { contentLength: readString(record, "contentLength") } : {}),
    ...(readString(record, "contentType") ? { contentType: readString(record, "contentType") } : {}),
    ...(readString(record, "createdAt") ? { createdAt: readString(record, "createdAt") } : {}),
  };
}

function remixFromSource(source: DeployAppSourceState): DeployAppRemixState {
  return {
    appId: source.appId,
    readiness: source.readiness,
    remixEnabled: source.remixEnabled,
    ...(source.sourceKind ? { sourceKind: source.sourceKind } : {}),
    ...(source.readinessReason ? { readinessReason: source.readinessReason } : {}),
    ...(source.updatedAt ? { updatedAt: source.updatedAt } : {}),
    ...(source.version ? { version: source.version } : {}),
  };
}

function mapGit(value: unknown): DeployAppSourceGit | undefined {
  const record = asRecord(value);
  const repoUrl = readString(record, "repoUrl");
  if (!repoUrl) {
    return undefined;
  }
  return {
    repoProvider: readString(record, "repoProvider") || "GITHUB",
    repoUrl,
    repoRef: readString(record, "repoRef"),
    cloneMode: readString(record, "cloneMode") || "SHALLOW",
    repoStatus: readString(record, "repoStatus"),
    ...(readString(record, "subPath") ? { subPath: readString(record, "subPath") } : {}),
    ...(readString(record, "credentialSecretRef")
      ? { credentialSecretRef: readString(record, "credentialSecretRef") }
      : {}),
  };
}

function mapArchive(value: unknown): DeployAppSourceArchive | undefined {
  const record = asRecord(value);
  const artifactId = readString(record, "artifactId");
  if (!artifactId) {
    return undefined;
  }
  return {
    artifactId,
    uploadSessionId: readString(record, "uploadSessionId"),
    fileName: readString(record, "fileName") || artifactId,
    contentType: readString(record, "contentType"),
    contentLength: readString(record, "contentLength"),
    driveNodeId: readString(record, "driveNodeId"),
    createdAt: readString(record, "createdAt"),
    ...(readString(record, "checksumSha256") ? { checksumSha256: readString(record, "checksumSha256") } : {}),
    ...(readString(record, "driveSpaceId") ? { driveSpaceId: readString(record, "driveSpaceId") } : {}),
  };
}

function readReadiness(record: Record<string, unknown>): DeployAppSourceReadiness {
  // Anything the backend does not explicitly call ready is treated as missing:
  // an unknown verdict must never unlock the remix switch.
  return readString(record, "readiness").toUpperCase() === "READY" ? "READY" : "MISSING";
}

function readReadinessReason(
  record: Record<string, unknown>,
): DeployAppSourceReadinessReason | undefined {
  const code = readString(record, "readinessReason").toUpperCase();
  return isReadinessReason(code) ? code : undefined;
}

function readSourceKind(value: unknown): DeployAppSourceKind | undefined {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return normalized === "GIT" || normalized === "ARCHIVE" ? normalized : undefined;
}

function errorKind(error: unknown): DeployAppSourceErrorKind | undefined {
  return error instanceof DeployAppSourceServiceError ? error.kind : undefined;
}

function isReadinessReason(value: string): value is DeployAppSourceReadinessReason {
  return (DEPLOY_APP_SOURCE_READINESS_REASONS as readonly string[]).includes(value);
}

function call<T>(operation: string, run: () => Promise<T>): Promise<T> {
  return run().catch((error: unknown) => {
    throw normalizeError(operation, error);
  });
}

function normalizeError(operation: string, error: unknown): DeployAppSourceServiceError {
  if (error instanceof DeployAppSourceServiceError) {
    return error;
  }
  const status = errorStatus(error);
  const message = errorMessage(error) || `app source ${operation} failed`;
  // The refusal text may live in the problem detail rather than the message the
  // client surfaced, so the reason code is looked up across both.
  const reason = extractReadinessReason(`${message} ${errorProblemText(error)}`);
  if (status === undefined && isNetworkShaped(error)) {
    return new DeployAppSourceServiceError("network", message);
  }
  const withReason = (kind: DeployAppSourceErrorKind): DeployAppSourceServiceError =>
    new DeployAppSourceServiceError(kind, message, status, reason);
  if (status === 401) {
    return withReason("unauthorized");
  }
  if (status === 403) {
    return withReason("forbidden");
  }
  if (status === 404) {
    return withReason("not-found");
  }
  if (status === 409) {
    return withReason("conflict");
  }
  if (status === 400 || status === 422) {
    return withReason("validation");
  }
  if (status === 501 || status === 502 || status === 503 || status === 504) {
    return withReason("unavailable");
  }
  if (status !== undefined && status >= 500) {
    return withReason("unavailable");
  }
  return withReason("unknown");
}

function errorStatus(error: unknown): number | undefined {
  const record = asRecord(error);
  const problem = asRecord(record.problem);
  return numeric(record.status)
    ?? numeric(record.statusCode)
    ?? numeric(record.httpStatus)
    ?? numeric(problem.status);
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  const record = asRecord(error);
  const problem = asRecord(record.problem);
  return readString(record, "message")
    || readString(record, "detail")
    || readString(problem, "detail")
    || readString(problem, "title")
    || readString(record, "error")
    || "";
}

/** The problem-detail text, which may carry a code the surfaced message dropped. */
function errorProblemText(error: unknown): string {
  const record = asRecord(error);
  const problem = asRecord(record.problem);
  return [
    readString(record, "detail"),
    readString(problem, "detail"),
    readString(problem, "title"),
  ].join(" ");
}

/**
 * `true` when the failure never reached an HTTP status: the generated client
 * reports transport failures with a `NETWORK_ERROR`/`TIMEOUT` code (or a plain
 * `TypeError` from `fetch`), and the console owes the operator a different
 * sentence for those than for a rejected request.
 */
function isNetworkShaped(error: unknown): boolean {
  const record = asRecord(error);
  const code = readString(record, "code").toUpperCase();
  const name = readString(record, "name");
  return code === "NETWORK_ERROR"
    || code === "TIMEOUT"
    || name === "NetworkError"
    || name === "TimeoutError"
    || name === "TypeError";
}

function extractReadinessReason(text: string): DeployAppSourceReadinessReason | undefined {
  if (!text) {
    return undefined;
  }
  const upper = text.toUpperCase();
  return DEPLOY_APP_SOURCE_READINESS_REASONS.find((code) => upper.includes(code));
}

function unwrapItem(value: unknown): unknown {
  const record = asRecord(value);
  if (record.item !== undefined) {
    return record.item;
  }
  const data = asRecord(record.data);
  return data.item !== undefined ? data.item : value;
}

function readItems(payload: unknown): readonly unknown[] {
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
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(record: Record<string, unknown>, ...keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
}

function readBoolean(record: Record<string, unknown>, ...keys: readonly string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return undefined;
}

function numeric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}
