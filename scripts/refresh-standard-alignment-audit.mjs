#!/usr/bin/env node
// @sdkwork/clawrouter-workspace 锟??refresh-standard-alignment-audit.mjs
//
// Generates `generated/audit/standard-alignment-facts.json` by reading the
// repository source of truth. The audit document
// (`docs/standard-alignment-audit.md`) cites these facts; this script is the
// single source of truth so the audit cannot silently drift from reality.
//
// Run:
//   node scripts/refresh-standard-alignment-audit.mjs            // writes JSON + prints summary
//   node scripts/refresh-standard-alignment-audit.mjs --check    // exits non-zero if JSON would change
//   node scripts/refresh-standard-alignment-audit.mjs --strict   // exits non-zero if any P0 fact is unresolved
//   node scripts/refresh-standard-alignment-audit.mjs --help     // prints usage without collecting or writing facts
//
// This script does NOT modify `docs/standard-alignment-audit.md` directly.
// The markdown audit is curated prose; the JSON is the machine-checkable
// evidence. CI should run `--check --strict` to fail when reality drifts.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

import {
  analyzeClientLocalSqliteRuntime,
  analyzeRedisHaManifest,
} from "./lib/standard-alignment-runtime-facts.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const OUTPUT_PATH = join(REPO_ROOT, "generated", "audit", "standard-alignment-facts.json");

function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}

function fileExists(rel) {
  return existsSync(join(REPO_ROOT, rel));
}

function listDir(rel) {
  const abs = join(REPO_ROOT, rel);
  if (!existsSync(abs)) return [];
  return readdirSync(abs);
}

function listFilesRecursive(rel, predicate) {
  const root = join(REPO_ROOT, rel);
  if (!existsSync(root)) return [];
  const files = [];
  const visit = (absoluteDir, relativeDir) => {
    for (const entry of readdirSync(absoluteDir)) {
      if ([".git", "node_modules", "target"].includes(entry)) continue;
      const absolutePath = join(absoluteDir, entry);
      const relativePath = join(relativeDir, entry).replaceAll("\\", "/");
      if (statSync(absolutePath).isDirectory()) {
        visit(absolutePath, relativePath);
      } else if (predicate(relativePath)) {
        files.push(relativePath);
      }
    }
  };
  visit(root, rel);
  return files.sort();
}

function readText(rel) {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

function grepCount(rel, pattern, flags = "") {
  if (!existsSync(join(REPO_ROOT, rel))) return 0;
  const text = readText(rel);
  const re = new RegExp(pattern, flags);
  return (text.match(re) || []).length;
}

function lineCount(rel) {
  if (!existsSync(join(REPO_ROOT, rel))) return 0;
  return readText(rel).split("\n").length;
}

// --- Fact collectors -------------------------------------------------------

function collectIdentityFacts() {
  const appConfig = readJson(join(REPO_ROOT, "sdkwork.app.config.json"));
  const workflow = readJson(join(REPO_ROOT, "sdkwork.workflow.json"));
  return {
    appKey: appConfig.app?.key,
    version: appConfig.release?.currentVersion,
    releaseChannels: Object.keys(appConfig.release?.latest || {}),
    publishStatus: appConfig.publish?.status,
    supportedDeploymentProfiles: appConfig.runtime?.supportedDeploymentProfiles,
    deliveryModes: appConfig.runtime?.deliveryModes,
    signatureRequired: appConfig.security?.signatureRequired === true,
    sbomRequired: appConfig.security?.sbomRequired === true,
    checksumRequired: appConfig.security?.checksumRequired === true,
    workflowSigningRequired: workflow.security?.signingRequired === true,
    workflowSbomRequired: workflow.security?.sbomRequired === true,
    workflowOidcRequired: workflow.security?.oidcRequired === true,
    workflowArtifactAttestations: workflow.security?.artifactAttestations === true,
    installPackageTargetCount: Array.isArray(workflow.targets) ? workflow.targets.length : 0,
  };
}

function collectCiSecurityFacts() {
  const verifyPath = ".github/workflows/verify.yml";
  if (!fileExists(verifyPath)) return { exists: false };
  const verify = readText(verifyPath);
  return {
    exists: true,
    runsPostgresService: /postgres:\d+/.test(verify) && /pg_isready/.test(verify),
    runsCargoAudit: /cargo audit --deny warnings/.test(verify),
    runsCargoDeny: /cargo deny check/.test(verify),
    runsTrivy: /trivy-action/.test(verify) || /trivy/.test(verify),
    runsGitleaks: /gitleaks/.test(verify),
    runsPnpmAudit: /pnpm audit/.test(verify),
    runsRustTests: /cargo (test|clippy|--workspace)/.test(verify) || /pnpm verify:ci/.test(verify),
    runsBrowserSmoke: /CLAWROUTER_BROWSER_SMOKE_REQUIRED/.test(verify),
    runsEdgeDevSmoke: /CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED/.test(verify),
    runsPostgresRequired: /pnpm test:postgres:required/.test(verify),
  };
}

function collectMigrationsFacts() {
  const pgDir = "database/migrations/postgres";
  const sqliteDir = "tests/fixtures/database/sqlite/migrations";
  const pgFiles = listDir(pgDir).filter((f) => f.endsWith(".sql")).sort();
  const sqliteFiles = listDir(sqliteDir).filter((f) => f.endsWith(".sql")).sort();
  const paired = (files) => {
    const up = new Set(files.filter((file) => file.endsWith(".up.sql")).map((file) => file.slice(0, -7)));
    const down = new Set(files.filter((file) => file.endsWith(".down.sql")).map((file) => file.slice(0, -9)));
    const missingDown = [...up].filter((id) => !down.has(id)).sort();
    const missingUp = [...down].filter((id) => !up.has(id)).sort();
    return { complete: missingDown.length === 0 && missingUp.length === 0, missingDown, missingUp };
  };
  return {
    postgresMigrationFiles: pgFiles,
    postgresBaselineExists: fileExists("database/ddl/baseline/postgres/0001_clawrouter_baseline.sql"),
    postgresPairs: paired(pgFiles),
    sqliteMigrationFiles: sqliteFiles,
    sqliteBaselineExists: fileExists("tests/fixtures/database/sqlite/ddl/baseline/0001_clawrouter_baseline.sql"),
    sqlitePairs: paired(sqliteFiles),
  };
}

function collectKubernetesFacts() {
  const k8sDir = "deployments/kubernetes";
  const files = listDir(k8sDir).filter((f) => f.endsWith(".yaml"));
  const expected = [
    "claw-router-gateway.yaml",
    "claw-router-app-api.yaml",
    "claw-router-admin-api.yaml",
    "claw-router-edge.yaml",
    "claw-router-redis.yaml",
    "claw-router-ingress.yaml",
    "claw-router-network-policy.yaml",
    "claw-router-migration-job.yaml",
  ];
  return {
    manifests: files,
    expectedPresent: expected.filter((f) => files.includes(f)),
    expectedMissing: expected.filter((f) => !files.includes(f)),
    hasAllExpected: expected.every((f) => files.includes(f)),
  };
}

function collectRedisHaFacts() {
  const redisManifestPath = "deployments/kubernetes/claw-router-redis.yaml";
  if (!fileExists(redisManifestPath)) return { exists: false, isHa: false };
  const runtimeSourcePaths = [
    "crates/sdkwork-claw-config/src/redis.rs",
    "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/pool.rs",
    "services/sdkwork-clawrouter-router-service/src/application/invocation/circuit_breaker.rs",
    "services/sdkwork-clawrouter-router-service/src/application/invocation/idempotency.rs",
    "services/sdkwork-clawrouter-router-service/src/application/invocation/tenant_inflight.rs",
  ];
  const runtimeSources = runtimeSourcePaths
    .filter(fileExists)
    .map(readText)
    .join("\n");
  return {
    exists: true,
    manifestPath: redisManifestPath,
    ...analyzeRedisHaManifest(readText(redisManifestPath), { runtimeSources }),
  };
}

function collectClientLocalSqliteFacts() {
  const tauriConfigPaths = listFilesRecursive(
    "apps",
    (path) => /(?:^|\/)tauri\.conf(?:\.[a-z0-9_-]+)?\.json$/iu.test(path),
  );
  const clientLocalSqliteAuthorityPaths = ["apps", "crates", "database"]
    .flatMap((root) => listFilesRecursive(
      root,
      (path) => /(?:client[-_]local.*sqlite|sqlite.*client[-_]local|src-tauri\/migrations).*\.sql$/iu
        .test(path),
    ));
  const serverRuntimeSourcePaths = [
    "crates/sdkwork-clawrouter-edge-runtime/src/runtime.rs",
    "crates/sdkwork-routes-clawrouter-app-api/src/routes.rs",
    "crates/sdkwork-routes-clawrouter-backend-api/src/routes.rs",
  ];
  const runtimeFacts = analyzeClientLocalSqliteRuntime({
    appConfig: readJson(join(REPO_ROOT, "sdkwork.app.config.json")),
    packageJson: readJson(join(REPO_ROOT, "package.json")),
    applicationLauncherSource: readText("scripts/run-claw-router-application.mjs"),
    tauriConfigPaths,
    clientLocalSqliteAuthorityPaths,
    serverRuntimeSources: serverRuntimeSourcePaths.filter(fileExists).map(readText).join("\n"),
  });
  return {
    ...runtimeFacts,
    fixtureBaselineExists: fileExists(
      "tests/fixtures/database/sqlite/ddl/baseline/0001_clawrouter_baseline.sql",
    ),
    fixtureMigrationFiles: listDir("tests/fixtures/database/sqlite/migrations")
      .filter((file) => file.endsWith(".sql"))
      .sort(),
    note: runtimeFacts.isImplemented
      ? "separate client-local SQLite runtime authority detected"
      : "SQLite test fixtures and launch arguments do not establish a client-local runtime",
  };
}

function collectI18nFacts() {
  const i18nIndexPath =
    "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/index.ts";
  if (!fileExists(i18nIndexPath)) return { exists: false };
  const text = readText(i18nIndexPath);
  const supportedLngsMatch = text.match(/SUPPORTED_LNGS\s*=\s*\[([^\]]+)\]/);
  const langs = supportedLngsMatch
    ? supportedLngsMatch[1]
        .split(",")
        .map((s) => s.trim().replace(/['"`]/g, ""))
        .filter(Boolean)
    : [];
  const prdRequired = ["en", "zh", "de", "fr", "ja", "ko", "ru"];
  return {
    exists: true,
    supportedLngs: langs,
    meetsPrdRequirement: prdRequired.every((l) => langs.includes(l)),
    fallbackLng: /fallbackLng:\s*['"]([^'"]+)['"]/.exec(text)?.[1] || null,
  };
}

function collectCircuitBreakerFacts() {
  const cbPath =
    "services/sdkwork-clawrouter-router-service/src/application/invocation/circuit_breaker.rs";
  if (!fileExists(cbPath)) {
    return { exists: false, implemented: false };
  }
  const text = readText(cbPath);
  return {
    exists: true,
    implemented: true,
    lineCount: lineCount(cbPath),
    hasStateMachine: /CircuitState::(Closed|Open|HalfOpen)/.test(text),
    hasRedisDistributedStore: /RedisCircuitBreakerStore|CircuitBreakerStateStore/.test(text),
    hasChannelIdScope: /channel_id/.test(text),
  };
}

function collectIdempotencyFacts() {
  const idemPath =
    "services/sdkwork-clawrouter-router-service/src/application/invocation/idempotency.rs";
  if (!fileExists(idemPath)) {
    return { exists: false, implemented: false };
  }
  const text = readText(idemPath);
  return {
    exists: true,
    implemented: true,
    lineCount: lineCount(idemPath),
    hasRedisStore: /RedisIdempotencyStore/.test(text),
    hasStreamingExclusion: /stream_body/.test(text) && /is_some_and/.test(text),
    hasSyntheticLocalResponse: /SyntheticLocalResponse/.test(text),
  };
}

function collectStreamingFacts() {
  const dispatcherPath =
    "crates/sdkwork-clawrouter-edge-runtime/src/invocation_dispatcher.rs";
  const passthroughTransportPath =
    "crates/sdkwork-clawrouter-edge-runtime/src/provider_passthrough_transport.rs";
  const dispatcherText = fileExists(dispatcherPath) ? readText(dispatcherPath) : "";
  const transportText = fileExists(passthroughTransportPath) ? readText(passthroughTransportPath) : "";
  return {
    invocationDispatcherSsePassthrough:
      /text\/event-stream/.test(dispatcherText) && /Body::new\(stream\)/.test(dispatcherText),
    providerPassthroughIncomingPassthrough:
      /axum::body::Body::new\(body\)/.test(transportText) && /Incoming/.test(transportText),
  };
}

function collectAppSessionSigningFacts() {
  const appSessionPath = "crates/sdkwork-claw-config/src/app_session.rs";
  const authPath = "crates/sdkwork-claw-http/src/auth.rs";
  if (!fileExists(appSessionPath) || !fileExists(authPath)) {
    return { exists: false };
  }
  const sessionText = readText(appSessionPath);
  const authText = readText(authPath);
  const usesSingleSharedSecret =
    /signing_secret:\s*String/.test(sessionText) && !/tenant_id.*key|per_tenant/.test(sessionText);
  const usesHmac = /use hmac::/.test(authText) || /Hmac/.test(authText);
  // Per-tenant resolver is wired when auth.rs imports the IAM TenantSigningKeyStore
  // (for signing) or TenantSigningKeyResolver (for verification) AND actually
  // invokes their methods. Detecting bare type-name imports is insufficient
  // because re-exports in lib.rs would create false positives.
  const hasStoreImport = /use\s+sdkwork_iam_web_adapter::TenantSigningKeyStore/.test(authText);
  const invokesEnsureActiveKey = /\.ensure_active_key\s*\(/.test(authText);
  const invokesResolveByKid = /\.resolve_signing_secret_by_kid\s*\(/.test(authText);
  const hasPerTenantResolver =
    (hasStoreImport && invokesEnsureActiveKey) || invokesResolveByKid;
  return {
    exists: true,
    usesSingleSharedSecret,
    usesHmac,
    hasPerTenantResolver,
    currentMode: hasPerTenantResolver ? "per-tenant" : usesSingleSharedSecret ? "shared-hmac" : "unknown",
  };
}

function collectProviderAdapterFacts() {
  const alicloudPath = "crates/provider-adapters/alicloud/src/lib.rs";
  const alicloudSignerPath = "crates/provider-adapters/alicloud/src/common/signer_v3.rs";
  const alicloudCargoPath = "crates/provider-adapters/alicloud/Cargo.toml";
  const paasPluginPath = "crates/sdkwork-claw-paas-plugin/src/plugin.rs";

  const alicloudLib = fileExists(alicloudPath) ? readText(alicloudPath) : "";
  const alicloudSigner = fileExists(alicloudSignerPath) ? readText(alicloudSignerPath) : "";
  const alicloudCargo = fileExists(alicloudCargoPath) ? readText(alicloudCargoPath) : "";
  const paasPlugin = fileExists(paasPluginPath) ? readText(paasPluginPath) : "";

  // Detection: alicloud endpoints() returns Vec::new() and resolve_endpoint returns None
  const alicloudEndpointsEmpty = /fn endpoints\([^)]*\)[^{]*\{\s*Vec::new\(\)/s.test(alicloudLib)
    || /fn endpoints\([^)]*\)[^{]*\{\s*Vec\s*::\s*new\(\)/s.test(alicloudLib);
  const alicloudResolveEndpointNone = /fn resolve_endpoint\([^)]*\)[^{]*\{\s*None\s*\}/s.test(alicloudLib);
  // Signer stub: file has no real signing logic (no HMAC update, no canonical request builder)
  const alicloudSignerStub =
    !/fn sign\b|fn canonical_request|fn string_to_sign|Hmac\s*::\s*new|mac\s*\.\s*update/.test(alicloudSigner);
  const alicloudHasHttpClientDep = /reqwest|^hyper\b/m.test(alicloudCargo) || /isahc|ureq/.test(alicloudCargo);
  const paasPluginHasBuiltinInvoke = hasBuiltinPaasInvokeOverride(paasPlugin);

  const isAlicloudStub = alicloudEndpointsEmpty && alicloudResolveEndpointNone && alicloudSignerStub && !alicloudHasHttpClientDep;

  return {
    alicloud: {
      isStub: isAlicloudStub,
      endpointsEmpty: alicloudEndpointsEmpty,
      resolveEndpointNone: alicloudResolveEndpointNone,
      signerStub: alicloudSignerStub,
      hasHttpClientDep: alicloudHasHttpClientDep,
    },
    paasPlugin: {
      hasBuiltinInvokeOverride: paasPluginHasBuiltinInvoke,
    },
  };
}

/**
 * Detect whether any built-in PaaS provider plugin overrides `invoke()`.
 *
 * A built-in plugin (Baidu / Alibaba / Tencent) that overrides `invoke()`
 * provides a real native adapter for at least one operation. Metadata-only
 * plugins keep the trait default `ProviderNotConfigured` error; the presence
 * of `ProviderNotConfigured` in source is expected (it is the error variant
 * used by the default implementation) and is NOT a stub signal on its own.
 *
 * The detector scopes each `impl PaasProviderPlugin for <BuiltinPlugin>` block
 * (from the impl header to the next sibling impl or helper function) and
 * checks for a `fn invoke` token inside that block.
 */
function hasBuiltinPaasInvokeOverride(pluginSource) {
  const builtinPlugins = [
    "BaiduPaasProviderPlugin",
    "AlibabaPaasProviderPlugin",
    "TencentPaasProviderPlugin",
  ];
  for (const plugin of builtinPlugins) {
    const marker = `impl PaasProviderPlugin for ${plugin}`;
    const implStart = pluginSource.indexOf(marker);
    if (implStart === -1) continue;
    const searchFrom = implStart + marker.length;
    const nextImpl = pluginSource.indexOf("impl PaasProviderPlugin for", searchFrom);
    const nextFn = pluginSource.indexOf("fn builtin_provider_metadata", searchFrom);
    const candidates = [nextImpl, nextFn].filter((idx) => idx !== -1);
    const blockEnd =
      candidates.length === 0 ? pluginSource.length : Math.min(...candidates);
    const block = pluginSource.slice(implStart, blockEnd);
    if (/\bfn\s+invoke\b/.test(block)) {
      return true;
    }
  }
  return false;
}

function collectSbomFacts() {
  const sbomScriptPath = "scripts/generate-release-sbom.mjs";
  if (!fileExists(sbomScriptPath)) return { exists: false };
  const text = readText(sbomScriptPath);
  return {
    exists: true,
    coversCargo: /cargo metadata|cargo.*sbom|--no-deps|cyclone.*cargo/.test(text),
    coversNpm: /collectPnpmPackages|pnpm-lock|npm.*sbom|cyclone.*npm/.test(text),
    coversArtifactChecksum: /sha256|checksum.*manifest|sha512/.test(text),
    hasDependencyEdges: /relationships.*DEPENDS_ON/.test(text) && !/omitted here for brevity/.test(text),
  };
}

function collectSignStepFacts() {
  const workflowPath = "sdkwork.workflow.json";
  const workflow = readJson(join(REPO_ROOT, workflowPath));
  const signSteps = (workflow.lifecycle?.sign) || [];
  const isPlaceholder = signSteps.some(
    (s) => /placeholder/i.test(s.name || "") || /Write-Host.*Signing policy is configured/.test(s.run || "")
  );
  const hasRealSigner = signSteps.some(
    (s) => /cosign|signtool|codesign|notarytool/i.test(s.run || "")
  );
  return {
    hasSignStep: signSteps.length > 0,
    isPlaceholder,
    hasRealSigner,
    steps: signSteps.map((s) => ({ name: s.name, run: (s.run || "").slice(0, 200) })),
  };
}

function collectTechArchFacts() {
  const techArchPath = "docs/architecture/tech/TECH_ARCHITECTURE.md";
  if (!fileExists(techArchPath)) return { exists: false };
  const text = readText(techArchPath);
  const sectionHeaders = ["## 2. Technology Choices", "## 3. System Boundaries And Modules",
    "## 4. Directory And Package Layout", "## 5. API, SDK, And Data Ownership",
    "## 6. Security, Privacy, And Observability", "## 7. Deployment And Runtime Topology"];
  const emptySections = sectionHeaders.filter((h) => {
    const idx = text.indexOf(h);
    if (idx < 0) return true;
    const after = text.slice(idx + h.length);
    const nextSection = after.indexOf("\n## ");
    const body = nextSection >= 0 ? after.slice(0, nextSection) : after;
    return body.trim().length === 0;
  });
  return {
    exists: true,
    lineCount: lineCount(techArchPath),
    emptySections,
    isOnlyIndex: emptySections.length === sectionHeaders.length,
  };
}

function collectMetricsFacts() {
  const metricsPath = "crates/sdkwork-claw-http/src/metrics.rs";
  if (!fileExists(metricsPath)) return { exists: false };
  const text = readText(metricsPath);
  return {
    exists: true,
    lineCount: lineCount(metricsPath),
    hasOnlyAtomicU64Counters: /AtomicU64/.test(text) && !/Histogram|HistogramVec/.test(text),
    hasLabelVec: /_vec!|CounterVec|HistogramVec|GaugeVec/.test(text),
  };
}

function collectTableConsistencyFacts() {
  // Count claw-router-owned tables across the three owned sources of truth.
  // The 90-table effective registry and 154-table catalog include sibling
  // module tables (iam, commerce, etc.) and are NOT drift 锟??they are a
  // scope difference. The claw-router-owned count must be consistent.
  const ddlPath = "database/ddl/baseline/postgres/0001_clawrouter_baseline.sql";
  const registryPath = "database/contract/table-registry.json";
  const schemaYamlPath = "database/contract/schema.yaml";

  let ddlCount = 0;
  if (fileExists(ddlPath)) {
    const ddl = readText(ddlPath);
    // Count CREATE TABLE IF NOT EXISTS <name> ( 锟??this regex already excludes
    // PARTITION OF attachments because they end with DEFAULT; (no opening paren).
    ddlCount = (ddl.match(/CREATE TABLE IF NOT EXISTS\s+\w+\s*\(/g) || []).length;
  }

  let registryCount = 0;
  if (fileExists(registryPath)) {
    const registry = readJson(join(REPO_ROOT, registryPath));
    registryCount = Array.isArray(registry.tables) ? registry.tables.length : 0;
  }

  let schemaYamlCount = 0;
  if (fileExists(schemaYamlPath)) {
    const yaml = readText(schemaYamlPath);
    schemaYamlCount = (yaml.match(/^- name:\s+[a-z][a-z0-9_]*\s*$/gm) || []).length;
  }

  const counts = { ddl: ddlCount, registry: registryCount, schemaYaml: schemaYamlCount };
  const consistent = ddlCount > 0 && ddlCount === registryCount && registryCount === schemaYamlCount;
  return {
    counts,
    consistent,
    note: consistent
      ? "claw-router-owned tables consistent across DDL, table-registry.json, and schema.yaml"
      : "drift detected in claw-router-owned table counts",
  };
}

function collectTablePartitionFacts() {
  // Engine-specific partitioning is applied through reviewed PostgreSQL migrations.
  const ddlPath = "database/ddl/baseline/postgres/0001_clawrouter_baseline.sql";
  const migrationDir = "database/migrations/postgres";
  const strategyPath = "docs/architecture/tech/TECH-35-high-volume-ledger-evolution.md";
  const requiredTables = [
    "ai_request_trace",
    "ai_routing_decision_log",
    "ai_usage",
    "ai_usage_service_provider_edge",
  ];
  const strategyDocumented = fileExists(strategyPath);
  if (!fileExists(ddlPath)) {
    return {
      exists: false,
      allPartitioned: false,
      strategyDocumented,
      strategyPath,
      reviewRequired: true,
      tables: [],
    };
  }
  const migrationSql = listDir(migrationDir)
    .filter((file) => file.endsWith(".up.sql"))
    .sort()
    .map((file) => readText(`${migrationDir}/${file}`))
    .join("\n");
  const ddl = `${readText(ddlPath)}\n${migrationSql}`;
  const tables = requiredTables.map((name) => {
    // Parent table has PARTITION BY RANGE (created_at); child has PARTITION OF <name> DEFAULT
    const hasPartitionBy = new RegExp(
      `CREATE TABLE IF NOT EXISTS\\s+${name}\\b[\\s\\S]*?PARTITION BY RANGE\\s*\\(\\s*created_at\\s*\\)`,
    ).test(ddl);
    const hasDefaultPartition = new RegExp(
      `CREATE TABLE IF NOT EXISTS\\s+${name}_default\\s+PARTITION OF\\s+${name}\\s+DEFAULT`,
    ).test(ddl);
    return { name, hasPartitionBy, hasDefaultPartition, partitioned: hasPartitionBy && hasDefaultPartition };
  });
  return {
    exists: true,
    tables,
    allPartitioned: tables.every((t) => t.partitioned),
    strategyDocumented,
    strategyPath,
    reviewRequired: !tables.every((t) => t.partitioned),
    note: tables.every((t) => t.partitioned)
      ? "reviewed PostgreSQL partition migration detected"
      : "direct time partitioning is intentionally blocked until business-key idempotency, archive reconciliation, and rollback gates in TECH-35 pass",
  };
}

// --- P0 status aggregation -------------------------------------------------

function buildP0Status(facts) {
  const items = [];

  items.push({
    id: "p0-sign-step-implementation",
    title: "Artifact signing implementation",
    status: facts.signStep.hasRealSigner ? "done" : (facts.signStep.isPlaceholder ? "pending" : "done"),
    evidence: facts.signStep,
  });

  items.push({
    id: "p0-sbom-npm-coverage",
    title: "SBOM npm dependency coverage",
    status: facts.sbom.coversNpm ? "done" : "pending",
    evidence: {
      coversCargo: facts.sbom.coversCargo,
      coversNpm: facts.sbom.coversNpm,
      coversArtifactChecksum: facts.sbom.coversArtifactChecksum,
      hasFullDependencyEdges: facts.sbom.hasDependencyEdges,
    },
  });

  items.push({
    id: "p0-client-local-sqlite-runtime",
    title: "Client-local SQLite runtime implementation",
    status: facts.clientLocalSqlite.isImplemented ? "done" : "pending",
    evidence: facts.clientLocalSqlite,
  });

  items.push({
    id: "p0-per-tenant-signing-keys",
    title: "Per-tenant app session signing keys",
    status: facts.appSessionSigning.hasPerTenantResolver ? "done" : "pending",
    evidence: { currentMode: facts.appSessionSigning.currentMode },
  });

  items.push({
    id: "p0-prometheus-metrics",
    title: "Prometheus histogram + OTLP metrics",
    status: facts.metrics.hasLabelVec ? "done" : "pending",
    evidence: {
      lineCount: facts.metrics.lineCount,
      hasOnlyAtomicU64Counters: facts.metrics.hasOnlyAtomicU64Counters,
    },
  });

  items.push({
    id: "p0-redis-ha-manifest",
    title: "Redis HA K8s manifest",
    status: facts.redisHa.isHa ? "done" : "pending",
    evidence: facts.redisHa,
  });

  items.push({
    id: "p0-alicloud-provider",
    title: "AliCloud provider real integration",
    status: facts.providerAdapters.alicloud.isStub ? "pending" : "done",
    evidence: facts.providerAdapters.alicloud,
  });

  items.push({
    id: "p0-paas-provider-invoke",
    title: "PaaS provider invoke real implementation",
    status: facts.providerAdapters.paasPlugin.hasBuiltinInvokeOverride ? "done" : "pending",
    evidence: facts.providerAdapters.paasPlugin,
  });

  items.push({
    id: "p0-tech-architecture-doc",
    title: "TECH_ARCHITECTURE.md complete",
    status: facts.techArch.isOnlyIndex ? "pending" : "done",
    evidence: { emptySections: facts.techArch.emptySections, lineCount: facts.techArch.lineCount },
  });

  items.push({
    id: "p0-table-count-consistency",
    title: "Table count three-way consistency (DDL / registry / schema.yaml)",
    status: facts.tableConsistency.consistent ? "done" : "pending",
    evidence: facts.tableConsistency,
  });

  items.push({
    id: "p0-high-traffic-table-partition",
    title: "High-traffic table partitioning (ai_request_trace / ai_routing_decision_log / ai_usage / ai_usage_service_provider_edge)",
    status: facts.tablePartition.allPartitioned ? "done" : "pending",
    evidence: facts.tablePartition,
  });

  return items;
}

function isAllowedVendorGitPath(relativePath) {
  void relativePath;
  return false;
}

function collectVendorWorkspaceFacts() {
  let tracked = [];
  try {
    const output = execSync("git ls-files vendor", {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    tracked = output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    tracked = [];
  }

  const disallowed = tracked.filter((entry) => !isAllowedVendorGitPath(entry));
  const gitignore = fileExists(".gitignore") ? readText(".gitignore") : "";
  const packageJson = fileExists("package.json") ? readJson("package.json") : { scripts: {} };

  return {
    trackedCount: tracked.length,
    disallowedCount: disallowed.length,
    disallowedSample: disallowed.slice(0, 15),
    indexClean: disallowed.length === 0,
    gitignoreHasVendorGuard: gitignore.includes("vendor/*"),
    packageHasVendorCheck: Boolean(packageJson.scripts?.["check:vendor-workspace"]),
    packageHasCommerceDebtCheck: Boolean(packageJson.scripts?.["check:commerce-debt"]),
  };
}

// --- Main ------------------------------------------------------------------

function collectAllFacts() {
  return {
    generatedAt: new Date().toISOString(),
    identity: collectIdentityFacts(),
    ciSecurity: collectCiSecurityFacts(),
    migrations: collectMigrationsFacts(),
    kubernetes: collectKubernetesFacts(),
    redisHa: collectRedisHaFacts(),
    clientLocalSqlite: collectClientLocalSqliteFacts(),
    i18n: collectI18nFacts(),
    circuitBreaker: collectCircuitBreakerFacts(),
    idempotency: collectIdempotencyFacts(),
    streaming: collectStreamingFacts(),
    appSessionSigning: collectAppSessionSigningFacts(),
    providerAdapters: collectProviderAdapterFacts(),
    sbom: collectSbomFacts(),
    signStep: collectSignStepFacts(),
    techArch: collectTechArchFacts(),
    metrics: collectMetricsFacts(),
    tableConsistency: collectTableConsistencyFacts(),
    tablePartition: collectTablePartitionFacts(),
    vendorWorkspace: collectVendorWorkspaceFacts(),
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Usage: node scripts/refresh-standard-alignment-audit.mjs [--check] [--strict] [--help]");
    console.log("  --check   Compare generated facts without writing files");
    console.log("  --strict  Exit non-zero while any P0 fact remains pending");
    console.log("  --help    Print this help without collecting or writing facts");
    return;
  }
  const checkMode = args.includes("--check");
  const strictMode = args.includes("--strict");

  const facts = collectAllFacts();
  const p0Items = buildP0Status(facts);
  const pendingP0 = p0Items.filter((i) => i.status === "pending");
  const factsEnvelope = {
    generatedAt: facts.generatedAt,
    facts,
    p0Status: p0Items,
    summary: {
      total: p0Items.length,
      done: p0Items.filter((i) => i.status === "done").length,
      pending: pendingP0.length,
    },
  };

  const jsonText = JSON.stringify(factsEnvelope, null, 2) + "\n";

  if (checkMode) {
    if (!fileExists("generated/audit/standard-alignment-facts.json")) {
      console.error("[audit] facts file does not exist; run without --check to generate");
      process.exit(1);
    }
    const existing = readText("generated/audit/standard-alignment-facts.json");
    // Compare ignoring generatedAt timestamps (top-level + nested in facts)
    const existingJson = JSON.parse(existing);
    const stripTimestamps = (obj) => {
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        const { generatedAt: _omit, ...rest } = obj;
        return Object.fromEntries(
          Object.entries(rest).map(([k, v]) => [k, stripTimestamps(v)])
        );
      }
      return obj;
    };
    const existingNormalized = stripTimestamps(existingJson);
    const newNormalized = stripTimestamps(factsEnvelope);
    if (JSON.stringify(existingNormalized) !== JSON.stringify(newNormalized)) {
      console.error("[audit] facts drift detected; run `node scripts/refresh-standard-alignment-audit.mjs` to regenerate");
      process.exit(1);
    }
    console.log(`[audit] facts up-to-date; P0: ${factsEnvelope.summary.done}/${factsEnvelope.summary.total} done, ${factsEnvelope.summary.pending} pending`);
  } else {
    writeFileSync(OUTPUT_PATH, jsonText, "utf8");
    console.log(`[audit] wrote ${OUTPUT_PATH}`);
    console.log(`[audit] P0: ${factsEnvelope.summary.done}/${factsEnvelope.summary.total} done, ${factsEnvelope.summary.pending} pending`);
  }

  if (strictMode && pendingP0.length > 0) {
    console.error(`[audit] STRICT mode: ${pendingP0.length} P0 items still pending:`);
    for (const item of pendingP0) {
      console.error(`  - ${item.id}: ${item.title}`);
    }
    process.exit(1);
  }
}

main();
