import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { SDKWORK_FILE_APP_OPENAPI, SDKWORK_FILE_BACKEND_OPENAPI } from "../../sdkwork-file-api-contracts/src/index";
import { SDKWORK_FILE_STANDARD } from "../../sdkwork-file-contracts/src/index";
import {
  SDKWORK_FILE_SDK_ARTIFACT_ROOT,
  SDKWORK_FILE_SDK_GENERATION_MANIFEST_VERSION,
  SDKWORK_FILE_SDK_GENERATION_TARGETS,
  createNodeFileSdkArtifactHost,
  materializeFileSdkArtifacts,
  createFileSdkArtifactWritePlan,
  createFileSdkGenerationManifest,
  createFileSdkOpenApiArtifacts,
  materializeRepositoryFileSdkArtifacts,
  parseFileSdkArtifactCliArgs,
  summarizeFileSdkArtifactMaterialization,
  validateFileSdkGenerationStandard,
  verifyFileSdkArtifacts,
  type SdkworkFileSdkArtifactHost,
  type SdkworkFileSdkArtifactWritePlan,
} from "../src/index";

describe("SDKWork file SDK generation manifest", () => {
  it("defines app and backend TypeScript SDK generation targets only", () => {
    const manifest = createFileSdkGenerationManifest();

    expect(manifest.version).toBe(SDKWORK_FILE_SDK_GENERATION_MANIFEST_VERSION);
    expect(manifest.targets.map((target) => target.surface)).toEqual(["app", "backend"]);
    expect(manifest.targets.map((target) => target.packageName)).toEqual([
      "@sdkwork/file-app-sdk",
      "@sdkwork/file-backend-sdk",
    ]);
    expect(manifest.targets.map((target) => target.clientName)).toEqual([
      "SdkworkFileAppClient",
      "SdkworkFileBackendClient",
    ]);
    expect(manifest.targets.every((target) => target.language === "typescript")).toBe(true);
    expect(manifest.targets.every((target) => target.generator === "sdkwork-openapi-typescript")).toBe(true);
    expect(manifest.targets).toEqual(SDKWORK_FILE_SDK_GENERATION_TARGETS);
  });

  it("binds each target to the canonical API prefix and OpenAPI source document", () => {
    const [appTarget, backendTarget] = createFileSdkGenerationManifest().targets;

    expect(appTarget.apiPrefix).toBe(SDKWORK_FILE_STANDARD.api.appPrefix);
    expect(backendTarget.apiPrefix).toBe(SDKWORK_FILE_STANDARD.api.backendPrefix);
    expect(appTarget.openapiJsonPath).toBe("/app/v3/api/openapi.json");
    expect(backendTarget.openapiJsonPath).toBe("/backend/v3/api/openapi.json");
    expect(appTarget.sourceDocument).toBe(SDKWORK_FILE_APP_OPENAPI);
    expect(backendTarget.sourceDocument).toBe(SDKWORK_FILE_BACKEND_OPENAPI);
  });

  it("exports deterministic OpenAPI artifacts for generator input", () => {
    const artifacts = createFileSdkOpenApiArtifacts();

    expect(Object.keys(artifacts)).toEqual([
      "sdkwork-file-app-openapi.json",
      "sdkwork-file-backend-openapi.json",
    ]);
    expect(JSON.parse(artifacts["sdkwork-file-app-openapi.json"]).paths).toHaveProperty("/app/v3/api/files");
    expect(JSON.parse(artifacts["sdkwork-file-backend-openapi.json"]).paths["/backend/v3/api/files"].get.operationId).toBe("admin.files.list");
    expect(JSON.parse(artifacts["sdkwork-file-app-openapi.json"]).paths).not.toHaveProperty("/app/v3/api/upload/sessions");
    expect(JSON.parse(artifacts["sdkwork-file-app-openapi.json"]).components.schemas).not.toHaveProperty("UploadSession");
    expect(JSON.parse(artifacts["sdkwork-file-app-openapi.json"]).components.schemas).not.toHaveProperty("PresignUploadPartResponse");
    expect(artifacts["sdkwork-file-app-openapi.json"]).not.toContain("presigned_url");
    expect(artifacts["sdkwork-file-app-openapi.json"]).not.toContain("presign");
    expect(artifacts["sdkwork-file-backend-openapi.json"]).toContain("x-sdkwork-admin-rbac");
  });

  it("validates generator standards without transport or local SDK forks", () => {
    expect(validateFileSdkGenerationStandard()).toEqual([]);

    for (const target of SDKWORK_FILE_SDK_GENERATION_TARGETS) {
      expect(target.generatedPackageRoot).toMatch(
        /^packages\/common\/file\/sdkwork-file-sdk-generation\/generated\/sdks\/file-(app|backend)-sdk\/file-(app|backend)-sdk-typescript$/,
      );
      expect(target.generatedPackageRoot).not.toMatch(/^sdks\//);
      expect(target.generatedPackageRoot).not.toContain("local");
      expect(target.generatedPackageRoot).not.toContain("fork");
      expect(target.transportPolicy).toBe("generated-sdk-only");
    }
  });

  it("rejects SDK generation manifests whose source OpenAPI documents violate API contract standards", () => {
    const manifest = createFileSdkGenerationManifest();
    const appSchemas = { ...SDKWORK_FILE_APP_OPENAPI.components.schemas };
    delete appSchemas.FileRef;
    const brokenAppDocument = {
      ...SDKWORK_FILE_APP_OPENAPI,
      components: {
        schemas: appSchemas,
      },
    };
    const driftedManifest = {
      ...manifest,
      targets: manifest.targets.map((target) => (
        target.surface === "app"
          ? { ...target, sourceDocument: brokenAppDocument }
          : target
      )),
    };

    expect(validateFileSdkGenerationStandard(driftedManifest)).toContain(
      "source_openapi_contract:unresolved_schema_ref:app:FileRef",
    );
  });

  it("creates a deterministic SDK family artifact write plan with hashes", () => {
    const firstPlan = createFileSdkArtifactWritePlan();
    const secondPlan = createFileSdkArtifactWritePlan();

    expect(firstPlan).toEqual(secondPlan);
    expect(firstPlan.rootDir).toBe(SDKWORK_FILE_SDK_ARTIFACT_ROOT);
    expect(firstPlan.files.map((file) => file.path)).toEqual([
      `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-app-sdk/sdk-manifest.json`,
      `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-app-sdk/README.md`,
      `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-app-sdk/openapi/file-app-sdk.openapi.json`,
      `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-app-sdk/openapi/file-app-sdk.sdkgen.json`,
      `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-backend-sdk/sdk-manifest.json`,
      `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-backend-sdk/README.md`,
      `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-backend-sdk/openapi/file-backend-sdk.openapi.json`,
      `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-backend-sdk/openapi/file-backend-sdk.sdkgen.json`,
      `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-sdk-generation-manifest.json`,
    ]);

    for (const file of firstPlan.files) {
      expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(file.content.endsWith("\n")).toBe(true);
      expect(file.content).not.toContain('"generatedAt":');
      expect(file.content).not.toContain("presigned_url");
    }

    const appAssembly = JSON.parse(readPlannedFile(firstPlan, `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-app-sdk/sdk-manifest.json`));
    expect(appAssembly).toEqual(
      expect.objectContaining({
        generationInputSpec: "openapi/file-app-sdk.openapi.json",
        packageName: "@sdkwork/file-app-sdk",
        transportPolicy: "generated-sdk-only",
        workspace: "file-app-sdk",
      }),
    );
    expect(appAssembly.derivedSpecs).toEqual({});
    expect(appAssembly.synchronizedArtifacts).toEqual(["openapi/file-app-sdk.sdkgen.json"]);
    expect(appAssembly.languages).toEqual([
      {
        clientName: "SdkworkFileAppClient",
        language: "typescript",
        packageName: "@sdkwork/file-app-sdk",
        packageRoot: "file-app-sdk-typescript",
      },
    ]);

    const manifest = JSON.parse(readPlannedFile(firstPlan, `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-sdk-generation-manifest.json`));
    expect(manifest.generatedAtPolicy).toBe("deterministic");
    expect(manifest.files).toHaveLength(8);
    expect(manifest.files[0]).toEqual({
      path: `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-app-sdk/sdk-manifest.json`,
      sha256: firstPlan.files[0].sha256,
      surface: "app",
    });
  });

  it("checks planned SDK artifacts without writing to the artifact host", () => {
    const plan = createFileSdkArtifactWritePlan();
    const host = createMemoryArtifactHost();

    const result = materializeFileSdkArtifacts(host, { mode: "check", plan });

    expect(result.mode).toBe("check");
    expect(result.clean).toBe(false);
    expect(result.changes).toHaveLength(plan.files.length);
    expect(result.changes.every((change) => change.action === "create")).toBe(true);
    expect(result.changes.map((change) => change.expectedSha256)).toEqual(
      plan.files.map((file) => file.sha256),
    );
    expect(host.files).toEqual({});
    expect(host.writes).toEqual([]);
  });

  it("applies only planned SDK artifacts and leaves unplanned files untouched", () => {
    const plan = createFileSdkArtifactWritePlan();
    const host = createMemoryArtifactHost({
      "sdks/unplanned/manual-note.txt": "operator owned\n",
    });

    const result = materializeFileSdkArtifacts(host, { mode: "apply", plan });

    expect(result.mode).toBe("apply");
    expect(result.clean).toBe(true);
    expect(result.changes.every((change) => change.action === "create")).toBe(true);
    expect(host.writes.map((write) => write.path)).toEqual(plan.files.map((file) => file.path));
    expect(host.files["sdks/unplanned/manual-note.txt"]).toBe("operator owned\n");

    const verifyResult = verifyFileSdkArtifacts(host, plan);
    expect(verifyResult.clean).toBe(true);
    expect(verifyResult.changes.every((change) => change.action === "unchanged")).toBe(true);
    expect(host.writes).toHaveLength(plan.files.length);
  });

  it("reports changed planned artifacts as drift without rewriting during verification", () => {
    const plan = createFileSdkArtifactWritePlan();
    const host = createMemoryArtifactHost(
      Object.fromEntries(plan.files.map((file) => [file.path, file.content])),
    );
    const driftedPath = plan.files[2].path;
    host.files[driftedPath] = `${host.files[driftedPath]}drift\n`;

    const result = verifyFileSdkArtifacts(host, plan);

    expect(result.clean).toBe(false);
    expect(result.mode).toBe("check");
    expect(result.changes.filter((change) => change.action === "update")).toEqual([
      expect.objectContaining({
        actualSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        expectedSha256: plan.files[2].sha256,
        path: driftedPath,
      }),
    ]);
    expect(host.writes).toEqual([]);
  });

  it("updates only drifted planned artifacts during apply", () => {
    const plan = createFileSdkArtifactWritePlan();
    const host = createMemoryArtifactHost(
      Object.fromEntries(plan.files.map((file) => [file.path, file.content])),
    );
    const driftedPath = plan.files[5].path;
    host.files[driftedPath] = "old generated content\n";

    const result = materializeFileSdkArtifacts(host, { mode: "apply", plan });

    expect(result.clean).toBe(true);
    expect(result.changes.filter((change) => change.action === "update").map((change) => change.path)).toEqual([
      driftedPath,
    ]);
    expect(host.writes).toEqual([{ content: readPlannedFile(plan, driftedPath), path: driftedPath }]);
    expect(verifyFileSdkArtifacts(host, plan).clean).toBe(true);
  });

  it("rejects unsafe artifact plans before any host write", () => {
    const plan = createFileSdkArtifactWritePlan();
    const unsafePlans: SdkworkFileSdkArtifactWritePlan[] = [
      {
        ...plan,
        rootDir: "../sdks",
      },
      {
        ...plan,
        files: [
          {
            ...plan.files[0],
            path: "/tmp/file-app-sdk.openapi.json",
          },
        ],
      },
      {
        ...plan,
        files: [
          {
            ...plan.files[0],
            path: "sdks/../outside/file-app-sdk.openapi.json",
          },
        ],
      },
      {
        ...plan,
        files: [
          {
            ...plan.files[0],
            path: "external/file-app-sdk.openapi.json",
          },
        ],
      },
    ];

    for (const unsafePlan of unsafePlans) {
      const host = createMemoryArtifactHost();
      expect(() => materializeFileSdkArtifacts(host, { mode: "apply", plan: unsafePlan })).toThrow(
        /unsafe SDK artifact plan/i,
      );
      expect(host.writes).toEqual([]);
    }
  });

  it("materializes planned artifacts through the Node filesystem host", () => {
    const workspaceRoot = createTemporaryWorkspace();
    try {
      const plan = createFileSdkArtifactWritePlan();
      const unplannedPath = join(workspaceRoot, "sdks", "operator-note.txt");
      const host = createNodeFileSdkArtifactHost({ workspaceRoot });

      mkdirSync(join(workspaceRoot, "sdks"), { recursive: true });
      writeFileSync(unplannedPath, "keep me\n", "utf8");
      const result = materializeFileSdkArtifacts(host, { mode: "apply", plan });

      expect(result.clean).toBe(true);
      expect(readFileSync(join(workspaceRoot, plan.files[0].path), "utf8")).toBe(plan.files[0].content);
      expect(readFileSync(join(workspaceRoot, plan.files[8].path), "utf8")).toBe(plan.files[8].content);
      expect(readFileSync(unplannedPath, "utf8")).toBe("keep me\n");
      expect(verifyFileSdkArtifacts(host, plan).clean).toBe(true);
    } finally {
      rmSync(workspaceRoot, { force: true, recursive: true });
    }
  });

  it("keeps direct Node filesystem host reads and writes inside the workspace root", () => {
    const workspaceRoot = createTemporaryWorkspace();
    try {
      const host = createNodeFileSdkArtifactHost({ workspaceRoot });

      expect(() => host.writeFile("../escape.txt", "bad\n")).toThrow(/outside SDK artifact workspace/i);
      expect(() => host.readFile("/tmp/escape.txt")).toThrow(/outside SDK artifact workspace/i);
      expect(existsSync(join(workspaceRoot, "..", "escape.txt"))).toBe(false);
    } finally {
      rmSync(workspaceRoot, { force: true, recursive: true });
    }
  });

  it("parses repository artifact command arguments with check as the safe default", () => {
    expect(parseFileSdkArtifactCliArgs([], "D:/repo")).toEqual({
      help: false,
      json: false,
      mode: "check",
      workspaceRoot: "D:/repo",
    });
    expect(parseFileSdkArtifactCliArgs(["--apply", "--json", "--workspace-root", "D:/next"], "D:/repo")).toEqual({
      help: false,
      json: true,
      mode: "apply",
      workspaceRoot: "D:/next",
    });
    expect(parseFileSdkArtifactCliArgs(["--check", "--workspace-root", "D:/repo"], "D:/fallback").mode).toBe("check");
    expect(parseFileSdkArtifactCliArgs(["--help"], "D:/repo").help).toBe(true);
    expect(() => parseFileSdkArtifactCliArgs(["--check", "--apply"], "D:/repo")).toThrow(/cannot combine/i);
    expect(() => parseFileSdkArtifactCliArgs(["--workspace-root"], "D:/repo")).toThrow(/requires a value/i);
    expect(() => parseFileSdkArtifactCliArgs(["--force"], "D:/repo")).toThrow(/unsupported/i);
  });

  it("runs repository artifact materialization with deterministic exit codes and summaries", () => {
    const workspaceRoot = createTemporaryWorkspace();
    try {
      const plan = createFileSdkArtifactWritePlan();
      const checkResult = materializeRepositoryFileSdkArtifacts({ mode: "check", workspaceRoot });

      expect(checkResult.exitCode).toBe(1);
      expect(checkResult.clean).toBe(false);
      expect(checkResult.counts).toEqual({ create: plan.files.length, unchanged: 0, update: 0 });
      expect(summarizeFileSdkArtifactMaterialization(checkResult)).toContain(
        `CREATE ${plan.files[0].path}`,
      );
      expect(existsSync(join(workspaceRoot, plan.files[0].path))).toBe(false);

      const applyResult = materializeRepositoryFileSdkArtifacts({ mode: "apply", workspaceRoot });

      expect(applyResult.exitCode).toBe(0);
      expect(applyResult.clean).toBe(true);
      expect(applyResult.counts).toEqual({ create: plan.files.length, unchanged: 0, update: 0 });
      expect(readFileSync(join(workspaceRoot, plan.files[0].path), "utf8")).toBe(plan.files[0].content);

      const cleanCheckResult = materializeRepositoryFileSdkArtifacts({ mode: "check", workspaceRoot });
      expect(cleanCheckResult.exitCode).toBe(0);
      expect(cleanCheckResult.clean).toBe(true);
      expect(cleanCheckResult.counts).toEqual({ create: 0, unchanged: plan.files.length, update: 0 });
      expect(summarizeFileSdkArtifactMaterialization(cleanCheckResult)).toContain("all planned artifacts are current");
    } finally {
      rmSync(workspaceRoot, { force: true, recursive: true });
    }
  });

  it("exposes a repository CLI for check and apply artifact materialization", () => {
    const workspaceRoot = createTemporaryWorkspace();
    try {
      const plan = createFileSdkArtifactWritePlan();
      const repoRoot = join(process.cwd(), "../../../..");
      const cliPath = join(repoRoot, "scripts/materialize-file-sdk-artifacts.mjs");

      const checkResult = spawnSync(
        process.execPath,
        [cliPath, "--check", "--json", "--workspace-root", workspaceRoot],
        { cwd: repoRoot, encoding: "utf8" },
      );

      expect(checkResult.status).toBe(1);
      expect(checkResult.stderr).toBe("");
      expect(JSON.parse(checkResult.stdout)).toEqual(
        expect.objectContaining({
          clean: false,
          counts: { create: plan.files.length, unchanged: 0, update: 0 },
          exitCode: 1,
          mode: "check",
        }),
      );
      expect(existsSync(join(workspaceRoot, plan.files[0].path))).toBe(false);

      const applyResult = spawnSync(
        process.execPath,
        [cliPath, "--apply", "--json", "--workspace-root", workspaceRoot],
        { cwd: repoRoot, encoding: "utf8" },
      );

      expect(applyResult.status).toBe(0);
      expect(applyResult.stderr).toBe("");
      expect(JSON.parse(applyResult.stdout)).toEqual(
        expect.objectContaining({
          clean: true,
          counts: { create: plan.files.length, unchanged: 0, update: 0 },
          exitCode: 0,
          mode: "apply",
        }),
      );
      expect(readFileSync(join(workspaceRoot, plan.files[0].path), "utf8")).toBe(plan.files[0].content);

      const cleanCheckResult = spawnSync(
        process.execPath,
        [cliPath, "--check", "--json", "--workspace-root", workspaceRoot],
        { cwd: repoRoot, encoding: "utf8" },
      );

      expect(cleanCheckResult.status).toBe(0);
      expect(JSON.parse(cleanCheckResult.stdout).counts).toEqual({
        create: 0,
        unchanged: plan.files.length,
        update: 0,
      });
    } finally {
      rmSync(workspaceRoot, { force: true, recursive: true });
    }
  }, 20_000);

  it("registers stable package and repository scripts for artifact check and apply", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    const repoPackageJson = JSON.parse(readFileSync(join(process.cwd(), "../../../..", "package.json"), "utf8"));

    expect(packageJson.scripts["artifacts:check"]).toBe(
      "node ../../../../scripts/materialize-file-sdk-artifacts.mjs --check",
    );
    expect(packageJson.scripts["artifacts:write"]).toBe(
      "node ../../../../scripts/materialize-file-sdk-artifacts.mjs --apply",
    );
    expect(repoPackageJson.scripts["file-sdk:artifacts:check"]).toBe(
      "node scripts/materialize-file-sdk-artifacts.mjs --check",
    );
    expect(repoPackageJson.scripts["file-sdk:artifacts:write"]).toBe(
      "node scripts/materialize-file-sdk-artifacts.mjs --apply",
    );
  });
});

function readPlannedFile(
  plan: ReturnType<typeof createFileSdkArtifactWritePlan>,
  path: string,
): string {
  const file = plan.files.find((entry) => entry.path === path);
  if (!file) {
    throw new Error(`Planned file not found: ${path}`);
  }
  return file.content;
}

function createMemoryArtifactHost(initialFiles: Record<string, string> = {}): SdkworkFileSdkArtifactHost & {
  files: Record<string, string>;
  writes: Array<{ content: string; path: string }>;
} {
  const files = { ...initialFiles };
  const writes: Array<{ content: string; path: string }> = [];

  return {
    files,
    readFile(path: string) {
      return files[path];
    },
    writeFile(path: string, content: string) {
      files[path] = content;
      writes.push({ content, path });
    },
    writes,
  };
}

function createTemporaryWorkspace(): string {
  return mkdtempSync(join(tmpdir(), "sdkwork-file-sdk-generation-"));
}
