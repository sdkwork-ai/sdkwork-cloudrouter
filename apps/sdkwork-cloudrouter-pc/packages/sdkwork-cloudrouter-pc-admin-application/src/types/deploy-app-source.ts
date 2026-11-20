/**
 * View models for a Deploy application's remix source.
 *
 * The wire contract is `apps.source.*` / `apps.remix.*` on the Deploy app API
 * (`sdks/_route-manifests/app-api/sdkwork-routes-deploy-app-api.route-manifest.json`,
 * `deploy.apps.read|write`):
 *
 * - `GET|PUT|DELETE /app/v3/api/apps/{appId}/source` — the configured source;
 * - `GET|PUT /app/v3/api/apps/{appId}/remix` — the remix flag the source unlocks.
 *
 * `readiness` is derived by the backend on every read from the referenced
 * repository or artifact, so the console never stores or guesses it. A `MISSING`
 * verdict always carries a reason code, which is what turns "source missing"
 * into an actionable sentence.
 */
export type DeployAppSourceKind = "GIT" | "ARCHIVE";

export type DeployAppSourceReadiness = "READY" | "MISSING";

/** Every reason code the backend can return for a `MISSING` source. */
export const DEPLOY_APP_SOURCE_READINESS_REASONS = [
  "SOURCE_NOT_CONFIGURED",
  "SOURCE_KIND_MISMATCH",
  "GIT_REPOSITORY_UNUSABLE",
  "GIT_PROVIDER_UNSUPPORTED",
  "GIT_REPOSITORY_URL_INVALID",
  "GIT_REPOSITORY_NOT_VALIDATED",
  "GIT_REFERENCE_INVALID",
  "GIT_SUB_PATH_INVALID",
  "ARCHIVE_UNAVAILABLE",
] as const;

export type DeployAppSourceReadinessReason = typeof DEPLOY_APP_SOURCE_READINESS_REASONS[number];

/** Git providers the Deploy source contract accepts. */
export const DEPLOY_APP_SOURCE_REPO_PROVIDERS = [
  "GITHUB",
  "GITEE",
  "GITLAB",
  "SELF_HOSTED",
] as const;

export type DeployAppRepoProvider = typeof DEPLOY_APP_SOURCE_REPO_PROVIDERS[number];

export type DeployAppCloneMode = "FULL" | "SHALLOW";

/** The Git half of a configured source. */
export interface DeployAppSourceGit {
  repoProvider: string;
  repoUrl: string;
  /** Effective ref; the backend falls back to the repository default branch. */
  repoRef: string;
  subPath?: string;
  cloneMode: string;
  credentialSecretRef?: string;
  /** `VALIDATED` is what makes a Git source ready. */
  repoStatus: string;
}

/** The archive half of a configured source. */
export interface DeployAppSourceArchive {
  artifactId: string;
  uploadSessionId: string;
  fileName: string;
  contentType: string;
  contentLength: string;
  checksumSha256?: string;
  driveNodeId: string;
  driveSpaceId?: string;
  createdAt: string;
}

/** One source as the console renders it. */
export interface DeployAppSourceState {
  appId: string;
  sourceKind?: DeployAppSourceKind;
  readiness: DeployAppSourceReadiness;
  readinessReason?: DeployAppSourceReadinessReason;
  remixEnabled: boolean;
  git?: DeployAppSourceGit;
  archive?: DeployAppSourceArchive;
  updatedAt?: string;
  version?: string;
}

/** The remix flag plus the readiness that gates it. */
export interface DeployAppRemixState {
  appId: string;
  remixEnabled: boolean;
  sourceKind?: DeployAppSourceKind;
  readiness: DeployAppSourceReadiness;
  readinessReason?: DeployAppSourceReadinessReason;
  updatedAt?: string;
  version?: string;
}

/** What one drawer open reads: the source and the remix flag. */
export interface DeployAppSourceSnapshot {
  source: DeployAppSourceState;
  remix: DeployAppRemixState;
}

/** An artifact already registered for this tenant, pickable as an archive source. */
export interface DeployArtifactOption {
  id: string;
  fileName: string;
  contentLength?: string;
  contentType?: string;
  createdAt?: string;
}

/** Editable source fields shared by both kinds. */
export interface DeployAppSourceDraft {
  kind: DeployAppSourceKind;
  repoProvider: string;
  repoUrl: string;
  repoRef: string;
  subPath: string;
  credentialSecretRef: string;
  cloneMode: DeployAppCloneMode;
  artifactId: string;
}

/** The `PUT /source` body for a Git source. */
export interface DeployAppSourceGitPayload {
  kind: "GIT";
  git: {
    repoProvider: DeployAppRepoProvider;
    repoUrl: string;
    repoRef?: string;
    subPath?: string;
    credentialSecretRef?: string;
    cloneMode: DeployAppCloneMode;
  };
}

/** The `PUT /source` body for an archive source. */
export interface DeployAppSourceArchivePayload {
  kind: "ARCHIVE";
  archive: { artifactId: string };
}

export type DeployAppSourceUpdatePayload =
  | DeployAppSourceGitPayload
  | DeployAppSourceArchivePayload;

export type DeployAppSourceIssueCode =
  | "repo-provider-required"
  | "repo-provider-invalid"
  | "repo-url-required"
  | "repo-url-invalid"
  | "repo-ref-invalid"
  | "sub-path-invalid"
  | "credential-ref-too-long"
  | "artifact-required";

export type DeployAppSourceIssueField =
  | "repoProvider"
  | "repoUrl"
  | "repoRef"
  | "subPath"
  | "credentialSecretRef"
  | "artifactId";

export interface DeployAppSourceIssue {
  field: DeployAppSourceIssueField;
  code: DeployAppSourceIssueCode;
}

/**
 * Source operations the drawer needs.
 *
 * Every method maps onto one generated SDK operation; the structural seam is
 * the same one `ApplicationScaffoldService` uses so a test can record calls
 * without constructing an HTTP client.
 */
export interface DeployAppSourceService {
  /** Read the configured source and the remix flag in one open. */
  load(appId: string): Promise<DeployAppSourceSnapshot>;
  /** Replace the configured source (`PUT /source`). */
  save(appId: string, payload: DeployAppSourceUpdatePayload): Promise<DeployAppSourceState>;
  /** Retire the source and switch remix off (`DELETE /source`). */
  retire(appId: string): Promise<void>;
  /** Enable or disable remix (`PUT /remix`). */
  setRemix(appId: string, enabled: boolean): Promise<DeployAppRemixState>;
  /** Artifacts already registered for the tenant, pickable as an archive source. */
  listArtifacts(): Promise<readonly DeployArtifactOption[]>;
}
