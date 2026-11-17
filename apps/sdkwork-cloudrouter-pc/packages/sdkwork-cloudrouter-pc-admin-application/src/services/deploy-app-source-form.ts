import type {
  DeployAppCloneMode,
  DeployAppRepoProvider,
  DeployAppSourceDraft,
  DeployAppSourceIssue,
  DeployAppSourceIssueCode,
  DeployAppSourceState,
  DeployAppSourceUpdatePayload,
} from "../types/deploy-app-source";
import { DEPLOY_APP_SOURCE_REPO_PROVIDERS } from "../types/deploy-app-source";

/**
 * Source form rules.
 *
 * These mirror `sdkwork_deploy_core::app_source` — the module the write path
 * validates with — so a typo is reported next to the field instead of coming
 * back as a `400` after a round trip:
 *
 * - `repoUrl` is `https://`, `http://` or scp-style `git@host:path`, and must
 *   not embed credentials (those belong in `credentialSecretRef`);
 * - `repoRef` is the subset of `git check-ref-format` a form can violate: no
 *   whitespace, no `..`, none of `~^:?*[\`, no leading `-`;
 * - `subPath` is a repository-relative directory: no absolute path, no
 *   backslash, no `.`/`..` segment, no empty segment.
 *
 * Optional fields left blank are omitted from the payload, which is how the
 * contract spells "repository default branch" and "repository root".
 */
export const MAX_SOURCE_REPO_URL_LENGTH = 1000;
export const MAX_SOURCE_REF_LENGTH = 255;
export const MAX_SOURCE_SUB_PATH_LENGTH = 1000;
export const MAX_CREDENTIAL_SECRET_REF_LENGTH = 512;

const DEFAULT_CLONE_MODE: DeployAppCloneMode = "SHALLOW";

/** Outcome of normalizing one optional Git field. */
export interface SourceFieldResult {
  ok: boolean;
  /** Normalized value; `""` means "omit the field". */
  value: string;
}

/**
 * Thrown when a payload is built from a draft that never passed
 * `validateSourceDraft`; the drawer validates first, so this only fires on a
 * programming error and names the field that would have been rejected.
 */
export class DeployAppSourceFormError extends Error {
  readonly code: DeployAppSourceIssueCode;

  constructor(code: DeployAppSourceIssueCode) {
    super(`app source draft is invalid: ${code}`);
    this.name = "DeployAppSourceFormError";
    this.code = code;
  }
}

export function createSourceDraft(source?: DeployAppSourceState): DeployAppSourceDraft {
  const git = source?.git;
  const kind = source?.sourceKind ?? (source?.archive ? "ARCHIVE" : "GIT");
  return {
    kind,
    repoProvider: git?.repoProvider?.trim().toUpperCase() || "GITHUB",
    repoUrl: git?.repoUrl ?? "",
    repoRef: git?.repoRef ?? "",
    subPath: git?.subPath ?? "",
    credentialSecretRef: git?.credentialSecretRef ?? "",
    cloneMode: git?.cloneMode?.trim().toUpperCase() === "FULL" ? "FULL" : DEFAULT_CLONE_MODE,
    artifactId: source?.archive?.artifactId ?? "",
  };
}

export function validateSourceDraft(draft: DeployAppSourceDraft): DeployAppSourceIssue[] {
  if (draft.kind === "ARCHIVE") {
    return draft.artifactId.trim()
      ? []
      : [{ field: "artifactId", code: "artifact-required" }];
  }

  const issues: DeployAppSourceIssue[] = [];
  const provider = draft.repoProvider.trim().toUpperCase();
  if (!provider) {
    issues.push({ field: "repoProvider", code: "repo-provider-required" });
  } else if (!isSupportedRepoProvider(provider)) {
    issues.push({ field: "repoProvider", code: "repo-provider-invalid" });
  }

  const repoUrl = draft.repoUrl.trim();
  if (!repoUrl) {
    issues.push({ field: "repoUrl", code: "repo-url-required" });
  } else if (!isValidSourceRepoUrl(repoUrl)) {
    issues.push({ field: "repoUrl", code: "repo-url-invalid" });
  }

  if (draft.repoRef.trim() && !normalizeSourceRef(draft.repoRef).ok) {
    issues.push({ field: "repoRef", code: "repo-ref-invalid" });
  }

  if (draft.subPath.trim() && !normalizeSourceSubPath(draft.subPath).ok) {
    issues.push({ field: "subPath", code: "sub-path-invalid" });
  }

  if (draft.credentialSecretRef.trim().length > MAX_CREDENTIAL_SECRET_REF_LENGTH) {
    issues.push({ field: "credentialSecretRef", code: "credential-ref-too-long" });
  }

  return issues;
}

/** Build the `PUT /source` body; call it only after `validateSourceDraft` is clean. */
export function toSourceUpdatePayload(draft: DeployAppSourceDraft): DeployAppSourceUpdatePayload {
  if (draft.kind === "ARCHIVE") {
    return { kind: "ARCHIVE", archive: { artifactId: draft.artifactId.trim() } };
  }
  const repoRef = normalizeSourceRef(draft.repoRef).value;
  const subPath = normalizeSourceSubPath(draft.subPath).value;
  const credentialSecretRef = draft.credentialSecretRef.trim();
  return {
    kind: "GIT",
    git: {
      repoProvider: requireRepoProvider(draft.repoProvider),
      repoUrl: draft.repoUrl.trim(),
      cloneMode: draft.cloneMode === "FULL" ? "FULL" : DEFAULT_CLONE_MODE,
      ...(repoRef ? { repoRef } : {}),
      ...(subPath ? { subPath } : {}),
      ...(credentialSecretRef ? { credentialSecretRef } : {}),
    },
  };
}

/** Same vocabulary as `validate_source_repo_url`. */
export function isValidSourceRepoUrl(url: string): boolean {
  const candidate = url.trim();
  if (!candidate || candidate.length > MAX_SOURCE_REPO_URL_LENGTH) {
    return false;
  }
  if (candidate.includes("://")) {
    if (!candidate.startsWith("https://") && !candidate.startsWith("http://")) {
      return false;
    }
    const rest = candidate.slice(candidate.indexOf("://") + 3);
    // `git@host:path` is the scp-style form, not an embedded credential.
    if (rest.includes("@") && !rest.startsWith("git@")) {
      return false;
    }
    return true;
  }
  return candidate.startsWith("git@");
}

/** Normalize an optional ref; `value: ""` means "the repository default branch". */
export function normalizeSourceRef(raw: string): SourceFieldResult {
  const candidate = raw.trim();
  if (!candidate) {
    return { ok: true, value: "" };
  }
  if (candidate.length > MAX_SOURCE_REF_LENGTH) {
    return { ok: false, value: candidate };
  }
  if (candidate.startsWith("-")) {
    return { ok: false, value: candidate };
  }
  if (/\s/u.test(candidate)) {
    return { ok: false, value: candidate };
  }
  if (candidate.includes("..")) {
    return { ok: false, value: candidate };
  }
  if (/[~^:?*[\\]/u.test(candidate)) {
    return { ok: false, value: candidate };
  }
  return { ok: true, value: candidate };
}

/** Normalize an optional repository-relative directory; `value: ""` means the root. */
export function normalizeSourceSubPath(raw: string): SourceFieldResult {
  let candidate = raw.trim();
  if (!candidate) {
    return { ok: true, value: "" };
  }
  if (candidate.includes("\\")) {
    return { ok: false, value: candidate };
  }
  while (candidate.startsWith("./")) {
    candidate = candidate.slice(2);
  }
  candidate = candidate.replace(/\/+$/u, "");
  if (!candidate || candidate === ".") {
    return { ok: true, value: "" };
  }
  if (candidate.startsWith("/") || candidate.length > MAX_SOURCE_SUB_PATH_LENGTH) {
    return { ok: false, value: candidate };
  }
  for (const segment of candidate.split("/")) {
    if (!segment || segment === "." || segment === "..") {
      return { ok: false, value: candidate };
    }
    if (!/^[A-Za-z0-9._-]+$/u.test(segment)) {
      return { ok: false, value: candidate };
    }
  }
  return { ok: true, value: candidate };
}

export function isSupportedRepoProvider(value: string): boolean {
  return (DEPLOY_APP_SOURCE_REPO_PROVIDERS as readonly string[]).includes(value);
}

function requireRepoProvider(value: string): DeployAppRepoProvider {
  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case "GITHUB":
    case "GITEE":
    case "GITLAB":
    case "SELF_HOSTED":
      return normalized;
    default:
      throw new DeployAppSourceFormError("repo-provider-invalid");
  }
}
