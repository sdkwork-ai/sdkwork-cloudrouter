#!/usr/bin/env node
/**
 * Merge missing routes from sdkwork-routes-* route manifests into clawrouter OpenAPI authorities.
 * Authority: API_SPEC.md section 15 SdkWorkApiResponse envelopes.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");

const TARGETS = [
  {
    surface: "app",
    manifestPath: "sdks/_route-manifests/app-api/sdkwork-routes-clawrouter-app-api.route-manifest.json",
    openApiPaths: [
      "generated/openapi/clawrouter-app-openapi.json",
      "apis/app-api/clawrouter/clawrouter-app-api.openapi.json",
    ],
    apiPrefix: "/app/v3/api",
    routeScope: "console",
  },
  {
    surface: "backend",
    manifestPath: "sdks/_route-manifests/backend-api/sdkwork-routes-clawrouter-backend-api.route-manifest.json",
    openApiPaths: [
      "generated/openapi/clawrouter-backend-openapi.json",
      "apis/backend-api/clawrouter/clawrouter-backend-api.openapi.json",
    ],
    apiPrefix: "/backend/v3/api",
    routeScope: "admin",
  },
];

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    check: argv.includes("--check") || !argv.includes("--apply"),
  };
}

function successSchemaRef(operationId, method) {
  const action = String(operationId ?? "").split(".").pop() ?? "";
  if (method === "get" && action === "list") {
    return { $ref: "#/components/schemas/SdkWorkListResponse" };
  }
  if (method === "post" && (action === "create" || action.endsWith("create"))) {
    return { $ref: "#/components/schemas/SdkWorkResourceResponse" };
  }
  if (method === "get" && (action === "retrieve" || action.endsWith("retrieve"))) {
    return { $ref: "#/components/schemas/SdkWorkResourceResponse" };
  }
  if (["post", "put", "patch", "delete"].includes(method)) {
    return { $ref: "#/components/schemas/SdkWorkCommandResponse" };
  }
  return { $ref: "#/components/schemas/SdkWorkResourceResponse" };
}

function problemResponse(description) {
  return {
    description,
    content: {
      "application/problem+json": {
        schema: { $ref: "#/components/schemas/ProblemDetail" },
      },
    },
  };
}

function inferTag(routePath, prefix) {
  const relative = routePath.startsWith(prefix)
    ? routePath.slice(prefix.length).replace(/^\//, "")
    : routePath.replace(/^\//, "");
  const segment = relative.split("/")[0] ?? "router";
  return segment.replace(/[{}]/g, "") || "router";
}

function inferUiRoute(routePath, prefix, routeScope) {
  const relative = routePath.startsWith(prefix)
    ? routePath.slice(prefix.length).replace(/^\//, "")
    : routePath.replace(/^\//, "");
  return `/${routeScope}/${relative || "root"}`;
}

function buildStubOperation(route, target) {
  const method = String(route.method ?? "GET").toLowerCase();
  const operationId = String(route.operationId ?? `${method}.operation`);
  const tag = Array.isArray(route.tags) && route.tags.length > 0 ? route.tags[0] : inferTag(route.path, target.apiPrefix);
  const authRequired = route.auth?.required !== false;
  const summary = `${method.toUpperCase()} ${route.path}`;

  const operation = {
    tags: [tag],
    operationId,
    summary,
    description: `Recovered route contract for ${route.path}.`,
    parameters: [],
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: successSchemaRef(operationId, method),
          },
        },
      },
      400: problemResponse("Bad Request"),
      401: problemResponse("Unauthorized"),
      500: problemResponse("Server Error"),
      default: problemResponse("Error response."),
    },
    "x-route-scope": target.routeScope,
    "x-contract-kind": method === "get" ? "read" : method === "delete" ? "delete" : "action",
    "x-read-sources": ["ops_audit_log"],
    "x-write-tables": [],
    "x-file-targets": [],
    "x-sdkwork-owner": "sdkwork-clawrouter",
    "x-sdkwork-api-authority": target.surface === "app" ? "sdkwork-clawrouter-app-api" : "sdkwork-clawrouter-backend-api",
    "x-sdkwork-request-context": "WebRequestContext",
    "x-sdkwork-api-surface": target.surface === "app" ? "app-api" : "backend-api",
    "x-sdkwork-source-route-crate":
      target.surface === "app" ? "sdkwork-routes-clawrouter-app-api" : "sdkwork-routes-clawrouter-backend-api",
    "x-source-file": "tools/bootstrap_openapi_from_route_manifest.mjs",
    "x-recovered-from-route-manifest": true,
    "x-ui-route": inferUiRoute(route.path, target.apiPrefix, target.routeScope),
  };

  if (authRequired) {
    operation.security = [{ AuthToken: [], AccessToken: [] }];
    operation["x-sdkwork-required-surface"] = "organizationMember";
  } else {
    operation.security = [];
  }

  if (method === "get") {
    operation.parameters = [
      { name: "page", in: "query", required: false, schema: { type: "integer", format: "int32" } },
      { name: "page_size", in: "query", required: false, schema: { type: "integer", format: "int32" } },
      { name: "q", in: "query", required: false, schema: { type: "string" } },
    ];
  }

  if (["post", "put", "patch"].includes(method)) {
    operation.requestBody = {
      required: false,
      description: `Optional request payload for ${operationId}.`,
      content: {
        "application/json": {
          schema: {
            type: "object",
            additionalProperties: true,
            description: "Recovered placeholder request body.",
          },
        },
      },
    };
  }

  return operation;
}

function ensureEnvelopeComponents(document) {
  document.components ??= {};
  document.components.schemas ??= {};
  const required = [
    "SdkWorkApiResponse",
    "SdkWorkResourceData",
    "SdkWorkPageData",
    "SdkWorkCommandData",
    "PageInfo",
    "SdkWorkResourceResponse",
    "SdkWorkListResponse",
    "SdkWorkCommandResponse",
    "ProblemDetail",
  ];
  for (const name of required) {
    if (!document.components.schemas[name]) {
      document.components.schemas[name] = {
        description: `Recovered placeholder for ${name}; regenerate from frontend contract for typed payloads.`,
        type: "object",
        additionalProperties: true,
      };
    }
  }
}

async function bootstrapTarget(target, mode) {
  const manifest = JSON.parse(
    await readFile(path.join(workspaceRoot, target.manifestPath), "utf8"),
  );
  const primaryOpenApiPath = path.join(workspaceRoot, target.openApiPaths[0]);
  const document = JSON.parse(await readFile(primaryOpenApiPath, "utf8"));
  ensureEnvelopeComponents(document);
  document.paths ??= {};

  let added = 0;
  let existing = 0;
  for (const route of manifest.routes ?? []) {
    if (!route?.path || !route?.method) {
      continue;
    }
    const method = String(route.method).toLowerCase();
    if (!HTTP_METHODS.has(method)) {
      continue;
    }
    const pathItem = document.paths[route.path] ?? {};
    if (pathItem[method]) {
      existing += 1;
      document.paths[route.path] = pathItem;
      continue;
    }
    pathItem[method] = buildStubOperation(route, target);
    document.paths[route.path] = pathItem;
    added += 1;
  }

  const serialized = `${JSON.stringify(document, null, 2)}\n`;
  const messages = [];
  for (const relativePath of target.openApiPaths) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    let current = null;
    try {
      current = await readFile(absolutePath, "utf8");
    } catch {
      current = null;
    }
    if (current === serialized) {
      messages.push(`ok ${relativePath}`);
      continue;
    }
    if (mode.check) {
      messages.push(`drift ${relativePath}`);
      continue;
    }
    await writeFile(absolutePath, serialized, "utf8");
    messages.push(`wrote ${relativePath}`);
  }

  return { surface: target.surface, added, existing, total: (manifest.routes ?? []).length, messages };
}

async function main() {
  const mode = parseArgs(process.argv.slice(2));
  const summaries = [];
  for (const target of TARGETS) {
    summaries.push(await bootstrapTarget(target, mode));
  }

  for (const summary of summaries) {
    console.log(
      `[${summary.surface}] manifestRoutes=${summary.total} existing=${summary.existing} added=${summary.added}`,
    );
    for (const message of summary.messages) {
      console.log(`  ${message}`);
    }
  }

  const drift = summaries.flatMap((summary) => summary.messages.filter((message) => message.startsWith("drift ")));
  if (mode.check && drift.length > 0) {
    process.exitCode = 1;
  }
}

await main();
