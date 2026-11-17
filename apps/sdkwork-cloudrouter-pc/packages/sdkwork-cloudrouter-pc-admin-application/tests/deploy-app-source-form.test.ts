import { describe, expect, it } from "vitest";

import {
  MAX_CREDENTIAL_SECRET_REF_LENGTH,
  isValidSourceRepoUrl,
  normalizeSourceRef,
  normalizeSourceSubPath,
  validateSourceDraft,
} from "../src/services/deploy-app-source-form";
import type { DeployAppSourceDraft } from "../src/types/deploy-app-source";

/**
 * Source form validation regression.
 *
 * The rules mirror the backend write contract, so each case here is a value the
 * Deploy service would reject with a 400 — the drawer must catch it first.
 */
function gitDraft(overrides: Partial<DeployAppSourceDraft> = {}): DeployAppSourceDraft {
  return {
    kind: "GIT",
    repoProvider: "GITHUB",
    repoUrl: "https://github.com/acme/app.git",
    repoRef: "",
    subPath: "",
    credentialSecretRef: "",
    cloneMode: "SHALLOW",
    artifactId: "",
    ...overrides,
  };
}

function codes(draft: DeployAppSourceDraft): string[] {
  return validateSourceDraft(draft).map((issue) => issue.code);
}

describe("source form validation", () => {
  it("accepts a minimal Git source and a full Git source", () => {
    expect(validateSourceDraft(gitDraft())).toEqual([]);
    expect(validateSourceDraft(gitDraft({
      repoProvider: "self_hosted",
      repoUrl: "git@git.example.com:acme/app.git",
      repoRef: "release/1.4",
      subPath: "apps/web",
      credentialSecretRef: "secrets/git",
    }))).toEqual([]);
  });

  it("requires a provider and a repository URL", () => {
    expect(codes(gitDraft({ repoProvider: "" }))).toEqual(["repo-provider-required"]);
    expect(codes(gitDraft({ repoProvider: "BITBUCKET" }))).toEqual(["repo-provider-invalid"]);
    expect(codes(gitDraft({ repoUrl: "   " }))).toEqual(["repo-url-required"]);
  });

  it("refuses URL shapes and embedded credentials the backend refuses", () => {
    expect(isValidSourceRepoUrl("https://github.com/acme/app.git")).toBe(true);
    expect(isValidSourceRepoUrl("http://git.internal/acme/app.git")).toBe(true);
    expect(isValidSourceRepoUrl("git@github.com:acme/app.git")).toBe(true);
    expect(isValidSourceRepoUrl("ftp://github.com/acme/app.git")).toBe(false);
    expect(isValidSourceRepoUrl("https://user:token@github.com/acme/app.git")).toBe(false);
    expect(isValidSourceRepoUrl("github.com/acme/app")).toBe(false);
    expect(codes(gitDraft({ repoUrl: "https://user:token@github.com/acme/app.git" })))
      .toEqual(["repo-url-invalid"]);
  });

  it("refuses refs that git itself would refuse", () => {
    expect(normalizeSourceRef(" release/1.4 ")).toEqual({ ok: true, value: "release/1.4" });
    expect(normalizeSourceRef("")).toEqual({ ok: true, value: "" });
    for (const ref of ["-x", "a..b", "a b", "a~b", "a^b", "a:b", "a?b", "a*b", "a[b", "a\\b"]) {
      expect(normalizeSourceRef(ref).ok).toBe(false);
      expect(codes(gitDraft({ repoRef: ref }))).toEqual(["repo-ref-invalid"]);
    }
    expect(normalizeSourceRef("a".repeat(256)).ok).toBe(false);
  });

  it("normalizes sub-directories and refuses escaping paths", () => {
    expect(normalizeSourceSubPath("./apps/web/")).toEqual({ ok: true, value: "apps/web" });
    expect(normalizeSourceSubPath("/")).toEqual({ ok: true, value: "" });
    expect(normalizeSourceSubPath(".")).toEqual({ ok: true, value: "" });
    for (const subPath of ["/apps/web", "apps\\web", "apps//web", "apps/../web", "apps/./web", "apps w/web"]) {
      expect(normalizeSourceSubPath(subPath).ok).toBe(false);
      expect(codes(gitDraft({ subPath }))).toEqual(["sub-path-invalid"]);
    }
  });

  it("bounds the credential reference length", () => {
    expect(codes(gitDraft({ credentialSecretRef: "s".repeat(MAX_CREDENTIAL_SECRET_REF_LENGTH) }))).toEqual([]);
    expect(codes(gitDraft({ credentialSecretRef: "s".repeat(MAX_CREDENTIAL_SECRET_REF_LENGTH + 1) })))
      .toEqual(["credential-ref-too-long"]);
  });

  it("only validates the active kind", () => {
    const archiveDraft = gitDraft({ kind: "ARCHIVE", repoUrl: "", repoProvider: "", artifactId: "" });

    expect(validateSourceDraft(archiveDraft)).toEqual([{ field: "artifactId", code: "artifact-required" }]);
    expect(validateSourceDraft({ ...archiveDraft, artifactId: "art-1" })).toEqual([]);
    // A Git source with a stale artifact id is still valid: the kind decides.
    expect(validateSourceDraft(gitDraft({ artifactId: "art-1" }))).toEqual([]);
  });

  it("reports every invalid field at once", () => {
    const issues = validateSourceDraft(gitDraft({
      repoProvider: "",
      repoUrl: "",
      repoRef: "-bad",
      subPath: "../escape",
    }));

    expect(issues.map((issue) => issue.field)).toEqual(["repoProvider", "repoUrl", "repoRef", "subPath"]);
  });
});
