import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import {
  SDKWORK_FILE_APP_OPENAPI,
  SDKWORK_FILE_BACKEND_OPENAPI,
  type SdkworkFileOpenApiDocument,
  validateFileApiContractStandard,
} from "../../sdkwork-file-api-contracts/src/index";
import {
  SDKWORK_FILE_STANDARD,
  type SdkworkFileApiSurface,
} from "../../sdkwork-file-contracts/src/index";

export type SdkworkFileSdkGenerationLanguage = "typescript";
export type SdkworkFileSdkGenerator = "sdkwork-openapi-typescript";
export type SdkworkFileSdkTransportPolicy = "generated-sdk-only";

export interface SdkworkFileSdkGenerationTarget {
  apiPrefix: string;
  archiveName: string;
  clientName: string;
  generatedPackageRoot: string;
  generator: SdkworkFileSdkGenerator;
  language: SdkworkFileSdkGenerationLanguage;
  openapiArtifactName: string;
  openapiJsonPath: string;
  packageName: string;
  sourceDocument: SdkworkFileOpenApiDocument;
  surface: SdkworkFileApiSurface;
  transportPolicy: SdkworkFileSdkTransportPolicy;
}

export interface SdkworkFileSdkGenerationManifest {
  domain: "file";
  generatedAtPolicy: "deterministic";
  targets: readonly SdkworkFileSdkGenerationTarget[];
  version: string;
}

export type SdkworkFileSdkOpenApiArtifacts = Record<string, string>;

export type SdkworkFileSdkArtifactKind =
  | "assembly"
  | "openapi"
  | "readme"
  | "sdkgen"
  | "sdk_generation_manifest";

export interface SdkworkFileSdkArtifactFile {
  content: string;
  kind: SdkworkFileSdkArtifactKind;
  path: string;
  sha256: string;
  surface?: SdkworkFileApiSurface;
}

export interface SdkworkFileSdkArtifactWritePlan {
  files: readonly SdkworkFileSdkArtifactFile[];
  rootDir: string;
}

export type SdkworkFileSdkMaterializeMode = "apply" | "check";
export type SdkworkFileSdkArtifactChangeAction = "create" | "unchanged" | "update";

export interface SdkworkFileSdkArtifactHost {
  readFile(path: string): string | undefined;
  writeFile(path: string, content: string): void;
}

export interface SdkworkFileSdkArtifactChange {
  action: SdkworkFileSdkArtifactChangeAction;
  actualSha256?: string;
  expectedSha256: string;
  path: string;
}

export interface SdkworkFileSdkArtifactMaterializeOptions {
  mode?: SdkworkFileSdkMaterializeMode;
  plan?: SdkworkFileSdkArtifactWritePlan;
}

export interface SdkworkFileSdkArtifactMaterializeResult {
  changes: readonly SdkworkFileSdkArtifactChange[];
  clean: boolean;
  mode: SdkworkFileSdkMaterializeMode;
}

export interface SdkworkFileSdkNodeArtifactHostOptions {
  workspaceRoot: string;
}

export interface SdkworkFileSdkArtifactCliSettings {
  help: boolean;
  json: boolean;
  mode: SdkworkFileSdkMaterializeMode;
  workspaceRoot: string;
}

export interface SdkworkFileSdkArtifactChangeCounts {
  create: number;
  unchanged: number;
  update: number;
}

export interface SdkworkFileSdkRepositoryMaterializeOptions {
  mode?: SdkworkFileSdkMaterializeMode;
  plan?: SdkworkFileSdkArtifactWritePlan;
  workspaceRoot: string;
}

export interface SdkworkFileSdkRepositoryMaterializeResult extends SdkworkFileSdkArtifactMaterializeResult {
  counts: SdkworkFileSdkArtifactChangeCounts;
  exitCode: 0 | 1;
}

export const SDKWORK_FILE_SDK_GENERATION_MANIFEST_VERSION = "2026.05.file-platform.sdk-generation.v1";
export const SDKWORK_FILE_SDK_ARTIFACT_ROOT = "packages/common/file/sdkwork-file-sdk-generation/generated/sdks";

export const SDKWORK_FILE_SDK_GENERATION_TARGETS: readonly SdkworkFileSdkGenerationTarget[] = [
  {
    apiPrefix: SDKWORK_FILE_STANDARD.api.appPrefix,
    archiveName: "sdkwork-file-app-sdk-typescript-0.1.0.zip",
    clientName: "SdkworkFileAppClient",
    generatedPackageRoot: `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-app-sdk/file-app-sdk-typescript`,
    generator: "sdkwork-openapi-typescript",
    language: "typescript",
    openapiArtifactName: "sdkwork-file-app-openapi.json",
    openapiJsonPath: "/app/v3/api/openapi.json",
    packageName: "@sdkwork/file-app-sdk",
    sourceDocument: SDKWORK_FILE_APP_OPENAPI,
    surface: "app",
    transportPolicy: "generated-sdk-only",
  },
  {
    apiPrefix: SDKWORK_FILE_STANDARD.api.backendPrefix,
    archiveName: "sdkwork-file-backend-sdk-typescript-0.1.0.zip",
    clientName: "SdkworkFileBackendClient",
    generatedPackageRoot: `${SDKWORK_FILE_SDK_ARTIFACT_ROOT}/file-backend-sdk/file-backend-sdk-typescript`,
    generator: "sdkwork-openapi-typescript",
    language: "typescript",
    openapiArtifactName: "sdkwork-file-backend-openapi.json",
    openapiJsonPath: "/backend/v3/api/openapi.json",
    packageName: "@sdkwork/file-backend-sdk",
    sourceDocument: SDKWORK_FILE_BACKEND_OPENAPI,
    surface: "backend",
    transportPolicy: "generated-sdk-only",
  },
] as const;

export function createFileSdkGenerationManifest(): SdkworkFileSdkGenerationManifest {
  return {
    domain: "file",
    generatedAtPolicy: "deterministic",
    targets: SDKWORK_FILE_SDK_GENERATION_TARGETS,
    version: SDKWORK_FILE_SDK_GENERATION_MANIFEST_VERSION,
  };
}

export function createFileSdkOpenApiArtifacts(
  manifest: SdkworkFileSdkGenerationManifest = createFileSdkGenerationManifest(),
): SdkworkFileSdkOpenApiArtifacts {
  return Object.fromEntries(
    manifest.targets.map((target) => [
      target.openapiArtifactName,
      stableJsonStringify(target.sourceDocument),
    ]),
  );
}

export function createFileSdkArtifactWritePlan(
  manifest: SdkworkFileSdkGenerationManifest = createFileSdkGenerationManifest(),
  rootDir = SDKWORK_FILE_SDK_ARTIFACT_ROOT,
): SdkworkFileSdkArtifactWritePlan {
  const plannedFiles = manifest.targets.flatMap((target) => createTargetArtifactFiles(target, rootDir));
  const hashedFiles = plannedFiles.map((file) => withHash(file));
  const rootManifest = withHash({
    content: stableJsonStringify({
      domain: manifest.domain,
      files: hashedFiles.map((file) => ({
        path: file.path,
        sha256: file.sha256,
        surface: file.surface,
      })),
      generatedAtPolicy: manifest.generatedAtPolicy,
      version: manifest.version,
    }),
    kind: "sdk_generation_manifest",
    path: `${rootDir}/file-sdk-generation-manifest.json`,
  });

  return {
    files: [...hashedFiles, rootManifest],
    rootDir,
  };
}

export function verifyFileSdkArtifacts(
  host: SdkworkFileSdkArtifactHost,
  plan: SdkworkFileSdkArtifactWritePlan = createFileSdkArtifactWritePlan(),
): SdkworkFileSdkArtifactMaterializeResult {
  return materializeFileSdkArtifacts(host, { mode: "check", plan });
}

export function materializeFileSdkArtifacts(
  host: SdkworkFileSdkArtifactHost,
  options: SdkworkFileSdkArtifactMaterializeOptions = {},
): SdkworkFileSdkArtifactMaterializeResult {
  const mode = options.mode ?? "check";
  const plan = options.plan ?? createFileSdkArtifactWritePlan();

  assertSafeArtifactWritePlan(plan);

  const changes = plan.files.map((file) => {
    const existingContent = host.readFile(file.path);
    if (existingContent === undefined) {
      return {
        action: "create",
        expectedSha256: file.sha256,
        path: file.path,
      } satisfies SdkworkFileSdkArtifactChange;
    }

    const actualSha256 = sha256(existingContent);
    if (actualSha256 !== file.sha256) {
      return {
        action: "update",
        actualSha256,
        expectedSha256: file.sha256,
        path: file.path,
      } satisfies SdkworkFileSdkArtifactChange;
    }

    return {
      action: "unchanged",
      actualSha256,
      expectedSha256: file.sha256,
      path: file.path,
    } satisfies SdkworkFileSdkArtifactChange;
  });

  if (mode === "apply") {
    for (const change of changes) {
      if (change.action === "unchanged") {
        continue;
      }

      const plannedFile = plan.files.find((file) => file.path === change.path);
      if (!plannedFile) {
        throw new Error(`Unsafe SDK artifact plan: missing planned file for ${change.path}`);
      }
      host.writeFile(plannedFile.path, plannedFile.content);
    }
  }

  return {
    changes,
    clean: mode === "apply" || changes.every((change) => change.action === "unchanged"),
    mode,
  };
}

export function createNodeFileSdkArtifactHost(
  options: SdkworkFileSdkNodeArtifactHostOptions,
): SdkworkFileSdkArtifactHost {
  const workspaceRoot = resolve(options.workspaceRoot);

  return {
    readFile(path: string): string | undefined {
      const resolvedPath = resolveArtifactWorkspacePath(workspaceRoot, path);
      if (!existsSync(resolvedPath)) {
        return undefined;
      }
      return readFileSync(resolvedPath, "utf8");
    },
    writeFile(path: string, content: string): void {
      const resolvedPath = resolveArtifactWorkspacePath(workspaceRoot, path);
      mkdirSync(dirname(resolvedPath), { recursive: true });
      writeFileSync(resolvedPath, content, "utf8");
    },
  };
}

export function parseFileSdkArtifactCliArgs(
  argv: readonly string[],
  defaultWorkspaceRoot: string,
): SdkworkFileSdkArtifactCliSettings {
  const settings: SdkworkFileSdkArtifactCliSettings = {
    help: false,
    json: false,
    mode: "check",
    workspaceRoot: defaultWorkspaceRoot,
  };
  let explicitMode: SdkworkFileSdkMaterializeMode | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }

    switch (arg) {
      case "--apply":
        explicitMode = setCliMode(explicitMode, "apply");
        settings.mode = "apply";
        break;
      case "--check":
        explicitMode = setCliMode(explicitMode, "check");
        settings.mode = "check";
        break;
      case "--help":
      case "-h":
        settings.help = true;
        break;
      case "--json":
        settings.json = true;
        break;
      case "--workspace-root":
        settings.workspaceRoot = requireCliValue(argv, index, arg);
        index += 1;
        break;
      default:
        throw new Error(`Unsupported file SDK artifact option: ${arg}`);
    }
  }

  return settings;
}

export function materializeRepositoryFileSdkArtifacts(
  options: SdkworkFileSdkRepositoryMaterializeOptions,
): SdkworkFileSdkRepositoryMaterializeResult {
  const mode = options.mode ?? "check";
  const host = createNodeFileSdkArtifactHost({ workspaceRoot: options.workspaceRoot });
  const result = materializeFileSdkArtifacts(host, {
    mode,
    plan: options.plan ?? createFileSdkArtifactWritePlan(),
  });
  const counts = countArtifactChanges(result.changes);

  return {
    ...result,
    counts,
    exitCode: result.clean ? 0 : 1,
  };
}

export function summarizeFileSdkArtifactMaterialization(
  result: SdkworkFileSdkRepositoryMaterializeResult,
): string {
  const lines = [
    result.clean
      ? "SDKWork file SDK artifacts are current."
      : "SDKWork file SDK artifacts are out of sync.",
    `mode: ${result.mode}`,
    `changes: create=${result.counts.create}, update=${result.counts.update}, unchanged=${result.counts.unchanged}`,
  ];

  const changedArtifacts = result.changes.filter((change) => change.action !== "unchanged");
  if (changedArtifacts.length === 0) {
    lines.push("all planned artifacts are current");
    return `${lines.join("\n")}\n`;
  }

  for (const change of changedArtifacts) {
    const actual = change.actualSha256 ? ` actual=${change.actualSha256}` : "";
    lines.push(`${change.action.toUpperCase()} ${change.path} expected=${change.expectedSha256}${actual}`);
  }

  return `${lines.join("\n")}\n`;
}

export function createFileSdkArtifactCliHelp(defaultWorkspaceRoot: string): string {
  return [
    "Usage: node scripts/materialize-file-sdk-artifacts.mjs [options]",
    "",
    "Create, update, or check deterministic SDKWork file SDK OpenAPI artifacts.",
    "",
    "Options:",
    "  --check                    Check planned artifacts without writing. This is the default.",
    "  --apply                    Write only planned artifacts, leaving unplanned files untouched.",
    "  --workspace-root <path>    Repository root to read/write. Defaults to the current workspace.",
    "  --json                     Print machine-readable result JSON.",
    "  -h, --help                 Show this help.",
    "",
    `Default workspace root: ${defaultWorkspaceRoot}`,
    "",
  ].join("\n");
}

export function validateFileSdkGenerationStandard(
  manifest: SdkworkFileSdkGenerationManifest = createFileSdkGenerationManifest(),
): string[] {
  const violations: string[] = [];

  if (manifest.version !== SDKWORK_FILE_SDK_GENERATION_MANIFEST_VERSION) {
    violations.push("manifest_version");
  }
  if (manifest.domain !== "file") {
    violations.push("manifest_domain");
  }
  if (manifest.generatedAtPolicy !== "deterministic") {
    violations.push("generated_at_policy");
  }
  if (manifest.targets.length !== 2) {
    violations.push("target_count");
  }

  for (const target of manifest.targets) {
    if (target.language !== "typescript") {
      violations.push(`target_language:${target.surface}`);
    }
    if (target.generator !== "sdkwork-openapi-typescript") {
      violations.push(`target_generator:${target.surface}`);
    }
    if (target.transportPolicy !== "generated-sdk-only") {
      violations.push(`target_transport_policy:${target.surface}`);
    }
    if (target.generatedPackageRoot.includes("local") || target.generatedPackageRoot.includes("fork")) {
      violations.push(`target_local_fork:${target.surface}`);
    }
    if (target.sourceDocument.openapi !== SDKWORK_FILE_STANDARD.api.openapi) {
      violations.push(`target_openapi_version:${target.surface}`);
    }
    if (Object.keys(target.sourceDocument.paths).some((path) => !path.startsWith(target.apiPrefix))) {
      violations.push(`target_path_prefix:${target.surface}`);
    }
  }
  const appSourceDocument = manifest.targets.find((target) => target.surface === "app")?.sourceDocument;
  const backendSourceDocument = manifest.targets.find((target) => target.surface === "backend")?.sourceDocument;
  if (appSourceDocument && backendSourceDocument) {
    for (const violation of validateFileApiContractStandard({
      app: appSourceDocument,
      backend: backendSourceDocument,
    })) {
      violations.push(`source_openapi_contract:${violation}`);
    }
  }

  return violations;
}

function stableJsonStringify(value: unknown): string {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

function createTargetArtifactFiles(
  target: SdkworkFileSdkGenerationTarget,
  rootDir: string,
): Array<Omit<SdkworkFileSdkArtifactFile, "sha256">> {
  const workspace = workspaceName(target);
  const workspaceRoot = `${rootDir}/${workspace}`;
  const openapiPath = `openapi/${workspace}.openapi.json`;
  const sdkgenPath = `openapi/${workspace}.sdkgen.json`;

  return [
    {
      content: stableJsonStringify(createAssemblyDocument(target, workspace, openapiPath, sdkgenPath)),
      kind: "assembly",
      path: `${workspaceRoot}/.sdkwork-assembly.json`,
      surface: target.surface,
    },
    {
      content: createSdkFamilyReadme(target, workspace, openapiPath, sdkgenPath),
      kind: "readme",
      path: `${workspaceRoot}/README.md`,
      surface: target.surface,
    },
    {
      content: stableJsonStringify(target.sourceDocument),
      kind: "openapi",
      path: `${workspaceRoot}/${openapiPath}`,
      surface: target.surface,
    },
    {
      content: stableJsonStringify(target.sourceDocument),
      kind: "sdkgen",
      path: `${workspaceRoot}/${sdkgenPath}`,
      surface: target.surface,
    },
  ];
}

function createAssemblyDocument(
  target: SdkworkFileSdkGenerationTarget,
  workspace: string,
  openapiPath: string,
  sdkgenPath: string,
): Record<string, unknown> {
  return {
    apiPrefix: target.apiPrefix,
    archiveName: target.archiveName,
    derivedSpecs: {},
    generationInputSpec: openapiPath,
    generator: target.generator,
    languages: [
      {
        clientName: target.clientName,
        language: target.language,
        packageName: target.packageName,
        packageRoot: packageRootName(target),
      },
    ],
    packageName: target.packageName,
    schemaVersion: "sdkwork.sdk-family.assembly.v1",
    surface: target.surface,
    synchronizedArtifacts: [sdkgenPath],
    transportPolicy: target.transportPolicy,
    workspace,
  };
}

function createSdkFamilyReadme(
  target: SdkworkFileSdkGenerationTarget,
  workspace: string,
  openapiPath: string,
  sdkgenPath: string,
): string {
  return [
    `# ${workspace}`,
    "",
    `SDKWork file ${target.surface} API SDK family.`,
    "",
    "## Workspace Layout",
    "",
    `- Authority contract: \`${openapiPath}\``,
    `- Synchronized sdkgen contract: \`${sdkgenPath}\``,
    `- SDK generation input: \`${openapiPath}\``,
    "- Assembly snapshot: `.sdkwork-assembly.json`",
    `- TypeScript workspace: \`${packageRootName(target)}\``,
    "",
    "## Generation Policy",
    "",
    `- Package: \`${target.packageName}\``,
    `- Client: \`${target.clientName}\``,
    `- Generator: \`${target.generator}\``,
    `- Transport: \`${target.transportPolicy}\``,
    "",
  ].join("\n");
}

function withHash(file: Omit<SdkworkFileSdkArtifactFile, "sha256">): SdkworkFileSdkArtifactFile {
  return {
    ...file,
    sha256: sha256(file.content),
  };
}

function workspaceName(target: SdkworkFileSdkGenerationTarget): string {
  const [workspace] = target.generatedPackageRoot.replace(new RegExp(`^${escapeRegExp(SDKWORK_FILE_SDK_ARTIFACT_ROOT)}/`), "").split("/");
  return workspace;
}

function packageRootName(target: SdkworkFileSdkGenerationTarget): string {
  const [, packageRoot] = target.generatedPackageRoot.replace(new RegExp(`^${escapeRegExp(SDKWORK_FILE_SDK_ARTIFACT_ROOT)}/`), "").split("/");
  return packageRoot;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function assertSafeArtifactWritePlan(plan: SdkworkFileSdkArtifactWritePlan): void {
  const violations: string[] = [];
  if (isUnsafeRelativeDirectory(plan.rootDir)) {
    violations.push(`rootDir:${plan.rootDir}`);
  }

  const rootPrefix = `${plan.rootDir}/`;
  const seenPaths = new Set<string>();

  for (const file of plan.files) {
    if (seenPaths.has(file.path)) {
      violations.push(`duplicate:${file.path}`);
    }
    seenPaths.add(file.path);

    if (isUnsafeRelativeFilePath(file.path)) {
      violations.push(`path:${file.path}`);
    }
    if (!file.path.startsWith(rootPrefix)) {
      violations.push(`outsideRoot:${file.path}`);
    }
    if (sha256(file.content) !== file.sha256) {
      violations.push(`hash:${file.path}`);
    }
  }

  if (violations.length > 0) {
    throw new Error(`Unsafe SDK artifact plan: ${violations.join(", ")}`);
  }
}

function setCliMode(
  currentMode: SdkworkFileSdkMaterializeMode | undefined,
  nextMode: SdkworkFileSdkMaterializeMode,
): SdkworkFileSdkMaterializeMode {
  if (currentMode && currentMode !== nextMode) {
    throw new Error("--check and --apply cannot combine");
  }
  return nextMode;
}

function requireCliValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function countArtifactChanges(
  changes: readonly SdkworkFileSdkArtifactChange[],
): SdkworkFileSdkArtifactChangeCounts {
  const counts: SdkworkFileSdkArtifactChangeCounts = {
    create: 0,
    unchanged: 0,
    update: 0,
  };

  for (const change of changes) {
    counts[change.action] += 1;
  }

  return counts;
}

function isUnsafeRelativeDirectory(path: string): boolean {
  return (
    path.length === 0 ||
    path === "." ||
    path.endsWith("/") ||
    path.includes("\\") ||
    isAbsoluteLikePath(path) ||
    hasUnsafePathSegment(path)
  );
}

function isUnsafeRelativeFilePath(path: string): boolean {
  return (
    path.length === 0 ||
    path.endsWith("/") ||
    path.includes("\\") ||
    isAbsoluteLikePath(path) ||
    hasUnsafePathSegment(path)
  );
}

function isAbsoluteLikePath(path: string): boolean {
  return path.startsWith("/") || path.startsWith("\\") || /^[A-Za-z]:[\\/]/.test(path);
}

function hasUnsafePathSegment(path: string): boolean {
  return path.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
}

function resolveArtifactWorkspacePath(workspaceRoot: string, artifactPath: string): string {
  if (isUnsafeRelativeFilePath(artifactPath)) {
    throw new Error(`Path outside SDK artifact workspace: ${artifactPath}`);
  }

  const resolvedPath = resolve(workspaceRoot, artifactPath);
  const relativePath = relative(workspaceRoot, resolvedPath);

  if (relativePath === "" || relativePath.startsWith("..") || isAbsoluteLikePath(relativePath)) {
    throw new Error(`Path outside SDK artifact workspace: ${artifactPath}`);
  }

  return resolvedPath;
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortJson(entry)]),
  );
}
