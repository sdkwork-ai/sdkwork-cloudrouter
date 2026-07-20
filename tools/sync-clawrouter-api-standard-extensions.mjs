import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");

const ORDER_APP_DEPENDENCY = {
  assemblyManifestPath:
    "../sdkwork-order/crates/sdkwork-order-gateway-assembly/assembly-manifest.json",
  openApiAuthorityPath:
    "../sdkwork-order/apis/app-api/order/order-app-api.openapi.json",
  packageName: "sdkwork-routes-order-app-api",
  apiAuthority: "sdkwork-order-app-api",
  handlerModule:
    "sdkwork_order_gateway_assembly::ApiAssembly::from_database_pool",
};

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
]);

const TARGETS = [
  {
    surface: "app-api",
    apiSurface: "app-api",
    packageName: "sdkwork-routes-clawrouter-app-api",
    capability: "router",
    apiAuthority: "sdkwork-clawrouter-app-api",
    sdkFamily: "clawrouter-app-sdk",
    prefix: "/app/v3/api",
    crateRoot: "crates/sdkwork-routes-clawrouter-app-api",
    openApiPaths: [
      "apis/app-api/clawrouter/clawrouter-app-api.openapi.json",
      "generated/openapi/clawrouter-app-openapi.json",
    ],
    routeManifestPath:
      "sdks/_route-manifests/app-api/sdkwork-routes-clawrouter-app-api.route-manifest.json",
    dependencyAssemblies: [ORDER_APP_DEPENDENCY],
  },
  {
    surface: "backend-api",
    apiSurface: "backend-api",
    packageName: "sdkwork-routes-clawrouter-backend-api",
    capability: "router",
    apiAuthority: "sdkwork-clawrouter-backend-api",
    sdkFamily: "clawrouter-backend-sdk",
    prefix: "/backend/v3/api",
    crateRoot: "crates/sdkwork-routes-clawrouter-backend-api",
    openApiPaths: [
      "apis/backend-api/clawrouter/clawrouter-backend-api.openapi.json",
      "generated/openapi/clawrouter-backend-openapi.json",
    ],
    routeManifestPath:
      "sdks/_route-manifests/backend-api/sdkwork-routes-clawrouter-backend-api.route-manifest.json",
  },
  {
    surface: "open-api",
    apiSurface: "open-api",
    packageName: "sdkwork-routes-clawrouter-open-api",
    capability: "router",
    apiAuthority: "sdkwork-clawrouter-open-api",
    sdkFamily: "clawrouter-open-sdk",
    prefix: "/v1",
    crateRoot: "crates/sdkwork-routes-llm-open-api",
    openApiPaths: [
      "apis/open-api/clawrouter/clawrouter-open-api.openapi.json",
      "sdks/clawrouter-open-sdk/openapi/clawrouter-open-sdk.openapi.json",
    ],
    routeManifestPath:
      "sdks/_route-manifests/open-api/sdkwork-routes-clawrouter-open-api.route-manifest.json",
  },
];

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    check: argv.includes("--check") || !argv.includes("--apply"),
  };
}

function inferExternalProtocolId(routePath) {
  const normalized = String(routePath ?? "").replace(/\\/g, "/");
  if (normalized.startsWith("/v1/")) {
    return "openai-v1";
  }
  if (normalized.startsWith("/anthropic/")) {
    return "anthropic-messages";
  }
  if (normalized.startsWith("/google/")) {
    return "google-gemini-v1beta";
  }
  if (normalized.startsWith("/kling/")) {
    return "kling-v1";
  }
  if (normalized.startsWith("/midjourney/")) {
    return "midjourney-v1";
  }
  if (normalized.startsWith("/nano-banana/")) {
    return "nano-banana-v1";
  }
  if (normalized.startsWith("/suno/")) {
    return "suno-v1";
  }
  if (normalized.startsWith("/vidu/")) {
    return "vidu-v1";
  }
  if (normalized.startsWith("/volcengine/")) {
    return "volcengine-v1";
  }
  return "clawrouter-vendor-relay";
}

function inferAuth(operation) {
  const routeScope = String(operation["x-route-scope"] ?? "").trim().toLowerCase();
  if (routeScope === "public") {
    return { mode: "public", required: false };
  }
  const security = Array.isArray(operation.security) ? operation.security : [];
  if (security.length === 0) {
    return { mode: "public", required: false };
  }
  const names = Object.keys(security[0] ?? {});
  if (names.includes("ApiKeyAuth") || names.includes("X-API-Key")) {
    return { mode: "api-key", required: true };
  }
  return { mode: "dual-token", required: true };
}

function inferSdkworkPermission(operation, routePath) {
  if (operation['x-sdkwork-permission']) {
    return undefined;
  }
  const operationId = String(operation.operationId ?? '').trim();
  if (!operationId) {
    return undefined;
  }

  const explicitPermissions = {
    'installation.status.retrieve': 'clawrouter.system.read',
    'monitor.alerts.list': 'clawrouter.system.read',
    'monitor.nodes.list': 'clawrouter.system.read',
    'monitor.performance.list': 'clawrouter.system.read',
    'rateLimits.apiKeys.list': 'clawrouter.gateway.read',
    'rateLimits.apiKeys.create': 'clawrouter.gateway.manage',
    'rateLimits.apiKeys.delete': 'clawrouter.gateway.manage',
    'firewalls.rules.list': 'clawrouter.gateway.read',
    'firewalls.rules.create': 'clawrouter.gateway.manage',
    'firewalls.rules.delete': 'clawrouter.gateway.manage',
  };
  if (explicitPermissions[operationId]) {
    return explicitPermissions[operationId];
  }

  const parts = operationId.split('.');
  const action = parts.at(-1);
  if (!action) {
    return undefined;
  }
  const resource = parts.slice(0, -1).join('.');
  if (!resource) {
    return undefined;
  }
  const permissionAction = action === 'list' || action === 'retrieve' || action === 'tree' ? 'read' : 'manage';
  return `clawrouter.${resource.replaceAll('.', '_')}.${permissionAction}`;
}

function stampOpenApiExtensions(document, target) {
  let changed = 0;
  if (target.apiSurface === "open-api") {
    document.info = document.info ?? {};
    if (document.info["x-sdkwork-wire-protocol"] !== "external") {
      document.info["x-sdkwork-wire-protocol"] = "external";
      changed += 1;
    }
    if (document.info["x-sdkwork-external-protocol-id"] !== "clawrouter-vendor-gateway") {
      document.info["x-sdkwork-external-protocol-id"] = "clawrouter-vendor-gateway";
      changed += 1;
    }
  }
  const paths = document.paths ?? {};
  for (const [routePath, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || !operation || typeof operation !== "object") {
        continue;
      }
      const owner = operation["x-sdkwork-owner"] ?? "sdkwork-clawrouter";
      const apiAuthority = operation["x-sdkwork-api-authority"] ?? target.apiAuthority;
      const sourceRouteCrate = operation["x-sdkwork-source-route-crate"] ?? target.packageName;
      const extensions = {
        "x-sdkwork-owner": owner,
        "x-sdkwork-api-authority": apiAuthority,
        "x-sdkwork-request-context": "WebRequestContext",
        "x-sdkwork-api-surface": target.apiSurface,
        "x-sdkwork-source-route-crate": sourceRouteCrate,
      };
      for (const [key, value] of Object.entries(extensions)) {
        if (operation[key] !== value) {
          operation[key] = value;
          changed += 1;
        }
      }
      const inferredPermission = inferSdkworkPermission(operation, routePath);
      if (inferredPermission && operation['x-sdkwork-permission'] !== inferredPermission) {
        operation['x-sdkwork-permission'] = inferredPermission;
        changed += 1;
      }
      if (inferAuth(operation).required && operation['x-sdkwork-required-surface'] !== 'organizationMember') {
        operation['x-sdkwork-required-surface'] = 'organizationMember';
        changed += 1;
      }
      if (target.apiSurface === "open-api") {
        const externalProtocolId = inferExternalProtocolId(routePath);
        if (operation["x-sdkwork-wire-protocol"] !== "external") {
          operation["x-sdkwork-wire-protocol"] = "external";
          changed += 1;
        }
        if (operation["x-sdkwork-external-protocol-id"] !== externalProtocolId) {
          operation["x-sdkwork-external-protocol-id"] = externalProtocolId;
          changed += 1;
        }
      }
      if (!operation.operationId && routePath) {
        operation.operationId = `${method}.${routePath.replace(/[{}]/g, "")}`;
        changed += 1;
      }
    }
  }
  return changed;
}

function buildRouteEntries(document, target, dependency = null) {
  const routes = [];
  const paths = document.paths ?? {};
  for (const [routePath, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || !operation || typeof operation !== "object") {
        continue;
      }
      routes.push({
        method: method.toUpperCase(),
        path: routePath,
        operationId: operation.operationId ?? null,
        tags: Array.isArray(operation.tags) ? operation.tags : [],
        ...(target.apiSurface === "open-api"
          ? {
              "x-sdkwork-wire-protocol": "external",
              "x-sdkwork-external-protocol-id":
                operation["x-sdkwork-external-protocol-id"] ?? inferExternalProtocolId(routePath),
            }
          : {}),
        auth: inferAuth(operation),
        handler: {
          module: dependency?.handlerModule ?? "crate::routes",
          name: null,
        },
        ownership: {
          owner:
            operation["x-sdkwork-owner"] ??
            (dependency ? "sdkwork-order" : "sdkwork-clawrouter"),
          apiAuthority:
            operation["x-sdkwork-api-authority"] ??
            dependency?.apiAuthority ??
            target.apiAuthority,
        },
        source: {
          routeCrate:
            operation["x-sdkwork-source-route-crate"] ??
            dependency?.packageName ??
            target.packageName,
          openApiAuthority:
            dependency?.openApiAuthorityPath ?? target.openApiPaths[0],
        },
        requestContext: "WebRequestContext",
        apiSurface: target.apiSurface,
      });
    }
  }

  return routes;
}

function buildRouteManifest(document, target, dependencyDocuments = []) {
  const routeIndex = new Map();
  for (const route of buildRouteEntries(document, target)) {
    routeIndex.set(routeKey(route.method, route.path), route);
  }
  for (const { document: dependencyDocument, dependency } of dependencyDocuments) {
    for (const route of buildRouteEntries(dependencyDocument, target, dependency)) {
      routeIndex.set(routeKey(route.method, route.path), route);
    }
  }
  const routes = [...routeIndex.values()];

  return {
    schemaVersion: 1,
    kind: "sdkwork.route.manifest",
    packageName: target.packageName,
    surface: target.surface,
    owner: "sdkwork-clawrouter",
    domain: "platform",
    capability: target.capability,
    apiAuthority: target.apiAuthority,
    sdkFamily: target.sdkFamily,
    prefix: target.prefix,
    source: {
      crateRoot: target.crateRoot,
      crateImport: target.packageName.replaceAll("-", "_"),
      openApiAuthority: target.openApiPaths[0],
    },
    routes,
  };
}

async function loadDependencyAssemblyDocuments(target) {
  const documents = [];
  for (const dependency of target.dependencyAssemblies ?? []) {
    const assemblyPath = path.resolve(workspaceRoot, dependency.assemblyManifestPath);
    const authorityPath = path.resolve(workspaceRoot, dependency.openApiAuthorityPath);
    const assembly = JSON.parse(await readFile(assemblyPath, "utf8"));
    const routeCrates = Array.isArray(assembly.routeCrates) ? assembly.routeCrates : [];
    const declaresMountedSurface = routeCrates.some(
      (routeCrate) =>
        routeCrate?.packageName === dependency.packageName &&
        routeCrate?.surface === target.surface &&
        routeCrate?.hasGatewayMount === true,
    );
    if (!declaresMountedSurface) {
      throw new Error(
        `${dependency.assemblyManifestPath} does not declare mounted ${target.surface} route crate ${dependency.packageName}`,
      );
    }

    const document = JSON.parse(await readFile(authorityPath, "utf8"));
    if (document.info?.["x-sdkwork-api-authority"] !== dependency.apiAuthority) {
      throw new Error(
        `${dependency.openApiAuthorityPath} does not declare ${dependency.apiAuthority}`,
      );
    }
    documents.push({ dependency, document });
  }
  return documents;
}

function routeKey(method, routePath) {
  return `${String(method ?? "").toUpperCase()}\0${String(routePath ?? "")}`;
}

async function processTarget(target, mode) {
  const primaryOpenApiPath = path.join(workspaceRoot, target.openApiPaths[0]);
  const document = JSON.parse(await readFile(primaryOpenApiPath, "utf8"));
  const stampedChanges = stampOpenApiExtensions(document, target);
  const dependencyDocuments = await loadDependencyAssemblyDocuments(target);
  const routeManifest = buildRouteManifest(document, target, dependencyDocuments);
  const manifestJson = `${JSON.stringify(routeManifest, null, 2)}\n`;
  const openApiJson = `${JSON.stringify(document, null, 2)}\n`;
  const manifestSha = createHash("sha256").update(manifestJson).digest("hex");

  const stampedOpenApiPaths =
    target.surface === "open-api"
      ? target.openApiPaths.filter((relativePath) => relativePath.startsWith("apis/"))
      : target.openApiPaths;

  const outputs = [
    ...stampedOpenApiPaths.map((relativePath) => ({
      relativePath,
      content: openApiJson,
    })),
    {
      relativePath: target.routeManifestPath,
      content: manifestJson,
    },
  ];
  const messages = [];
  for (const output of outputs) {
    const absolutePath = path.join(workspaceRoot, output.relativePath);
    let existing = null;
    try {
      existing = await readFile(absolutePath, "utf8");
    } catch {
      existing = null;
    }
    if (existing === output.content) {
      messages.push(`ok ${output.relativePath}`);
      continue;
    }
    if (mode.check) {
      messages.push(`drift ${output.relativePath}`);
      continue;
    }
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, output.content, "utf8");
    messages.push(`wrote ${output.relativePath}`);
  }

  return {
    stampedChanges,
    routeCount: routeManifest.routes.length,
    manifestSha,
    messages,
  };
}

async function main() {
  const mode = parseArgs(process.argv.slice(2));
  const summaries = [];
  for (const target of TARGETS) {
    summaries.push({
      surface: target.surface,
      ...(await processTarget(target, mode)),
    });
  }

  const drift = summaries.flatMap((summary) =>
    summary.messages.filter((message) => message.startsWith("drift ")),
  );
  for (const summary of summaries) {
    console.log(
      `[${summary.surface}] routes=${summary.routeCount} stamped=${summary.stampedChanges} manifestSha=${summary.manifestSha}`,
    );
    for (const message of summary.messages) {
      console.log(`  ${message}`);
    }
  }

  if (mode.check && drift.length > 0) {
    console.error(`OpenAPI/route-manifest standard extensions are out of date (${drift.length} files).`);
    process.exitCode = 1;
  }
}

await main();
