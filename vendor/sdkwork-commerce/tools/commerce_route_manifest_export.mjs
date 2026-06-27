#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SDK_OWNER = "sdkwork-commerce";
const SDK_DOMAIN = "commerce";
const PACKAGE_NAME = "sdkwork-commerce-api-server";
const CRATE_ROOT = "crates/sdkwork-commerce-api-server";

const SURFACE_CONFIG = {
  app: {
    surface: "app-api",
    apiAuthority: "sdkwork-commerce-app-api",
    sdkFamily: "sdkwork-commerce-app-sdk",
    prefix: "/app/v3/api",
    pathPrefix: "/app/v3/api",
    capability: "commerce",
    outputDir: "app-api",
    openapiPath: "apis/app-api/commerce/commerce-app-api.openapi.json",
  },
  backend: {
    surface: "backend-api",
    apiAuthority: "sdkwork-commerce-backend-api",
    sdkFamily: "sdkwork-commerce-backend-sdk",
    prefix: "/backend/v3/api",
    pathPrefix: "/backend/v3/api",
    capability: "commerce",
    outputDir: "backend-api",
    openapiPath: "apis/backend-api/commerce/commerce-backend-api.openapi.json",
  },
};

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const manifestRoot = path.join(workspaceRoot, "sdks", "_route-manifests");

function fail(message) {
  process.stderr.write(`[commerce_route_manifest_export] ${message}\n`);
  process.exit(1);
}

function readJson(relativePath) {
  const filePath = path.join(workspaceRoot, relativePath);
  if (!existsSync(filePath)) {
    fail(`missing file: ${relativePath}`);
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function authModeForOperation(operation) {
  const security = operation.security;
  if (!Array.isArray(security) || security.length === 0) {
    return "public";
  }
  const requirement = security[0];
  if (requirement && typeof requirement === "object") {
    if ("AuthToken" in requirement && "AccessToken" in requirement) {
      return "dual-token";
    }
    if ("ApiKey" in requirement) {
      return "api-key";
    }
  }
  return "dual-token";
}

function handlerName(operationId) {
  return operationId.replaceAll(".", "_");
}

function routeEntryFromOpenApi(pathValue, method, operation, surfaceConfig) {
  const tag = Array.isArray(operation.tags) && operation.tags.length > 0 ? operation.tags[0] : "commerce";
  const authMode = authModeForOperation(operation);
  const entry = {
    method: method.toUpperCase(),
    path: pathValue,
    operationId: operation.operationId,
    tags: [tag],
    requestContext: "WebRequestContext",
    apiSurface: surfaceConfig.surface,
    auth: {
      mode: authMode,
      required: authMode !== "public",
      tenantScope: "tenant",
      dataScope: "organization",
    },
    handler: {
      module: "crate",
      name: handlerName(operation.operationId),
    },
    schemas: {
      request: operation["x-sdkwork-request-schema"] ?? null,
      response: operation["x-sdkwork-response-schema"] ?? "CommerceApiResult",
      problem: "ProblemDetail",
    },
    ownership: {
      owner: SDK_OWNER,
      apiAuthority: surfaceConfig.apiAuthority,
    },
    source: {
      file: surfaceConfig.openapiPath,
    },
  };

  const permission = operation["x-sdkwork-permission"];
  if (permission) {
    entry.auth.permission = permission;
  }
  if (operation["x-sdkwork-idempotent"] === true) {
    entry.rateLimitTier = "default";
  }
  return entry;
}

function routesFromOpenApi(surfaceKey) {
  const surfaceConfig = SURFACE_CONFIG[surfaceKey];
  const document = readJson(surfaceConfig.openapiPath);
  const routes = [];

  for (const [pathValue, pathItem] of Object.entries(document.paths ?? {})) {
    if (!pathValue.startsWith(surfaceConfig.pathPrefix)) {
      continue;
    }
    for (const method of HTTP_METHODS) {
      const operation = pathItem?.[method];
      if (!operation?.operationId) {
        continue;
      }
      routes.push(routeEntryFromOpenApi(pathValue, method, operation, surfaceConfig));
    }
  }

  routes.sort((left, right) => {
    const pathCompare = left.path.localeCompare(right.path);
    if (pathCompare !== 0) {
      return pathCompare;
    }
    const methodCompare = left.method.localeCompare(right.method);
    if (methodCompare !== 0) {
      return methodCompare;
    }
    return left.operationId.localeCompare(right.operationId);
  });

  if (routes.length === 0) {
    fail(`${surfaceKey} manifest has no routes from ${surfaceConfig.openapiPath}`);
  }

  return routes;
}

function buildManifest(surfaceKey) {
  const surfaceConfig = SURFACE_CONFIG[surfaceKey];
  const routes = routesFromOpenApi(surfaceKey);

  return {
    schemaVersion: 1,
    kind: "sdkwork.route.manifest",
    packageName: PACKAGE_NAME,
    surface: surfaceConfig.surface,
    owner: SDK_OWNER,
    domain: SDK_DOMAIN,
    capability: surfaceConfig.capability,
    apiAuthority: surfaceConfig.apiAuthority,
    sdkFamily: surfaceConfig.sdkFamily,
    prefix: surfaceConfig.prefix,
    source: {
      crateRoot: CRATE_ROOT,
      crateImport: "sdkwork_commerce_api_server",
      openapiAuthority: surfaceConfig.openapiPath,
    },
    routes,
  };
}

function parseArgs(argv) {
  const parsed = { check: false };
  for (const arg of argv) {
    if (arg === "--check") {
      parsed.check = true;
      continue;
    }
    fail(`unknown argument: ${arg}`);
  }
  return parsed;
}

function writeManifest(surfaceKey, manifest, check) {
  const surfaceConfig = SURFACE_CONFIG[surfaceKey];
  const outputDir = path.join(manifestRoot, surfaceConfig.outputDir);
  const outputPath = path.join(outputDir, `${PACKAGE_NAME}.route-manifest.json`);
  const rendered = `${JSON.stringify(manifest, null, 2)}\n`;

  if (check) {
    if (!existsSync(outputPath)) {
      fail(`missing route manifest: ${outputPath}`);
    }
    const current = readFileSync(outputPath, "utf8");
    if (current !== rendered) {
      fail(`route manifest out of date: ${outputPath}`);
    }
    return outputPath;
  }

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, rendered, "utf8");
  return outputPath;
}

const args = parseArgs(process.argv.slice(2));
const appManifest = buildManifest("app");
const backendManifest = buildManifest("backend");

const appPath = writeManifest("app", appManifest, args.check);
const backendPath = writeManifest("backend", backendManifest, args.check);

process.stdout.write(
  `[commerce_route_manifest_export] ok app=${appManifest.routes.length} backend=${backendManifest.routes.length} paths=${appPath},${backendPath}\n`,
);
