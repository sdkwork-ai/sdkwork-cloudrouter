import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");

const APPBASE_IAM_MANIFEST_PATH = path.resolve(
  workspaceRoot,
  "../sdkwork-iam/crates/sdkwork-routes-iam-app-api/src/manifest.rs",
);
const MEMBERSHIP_APP_MANIFEST_PATH = path.resolve(
  workspaceRoot,
  "../sdkwork-membership/crates/sdkwork-routes-membership-app-api/src/manifest.rs",
);

const EXECUTABLE_DEPENDENCY_MOUNTS = {
  iam: {
    label: "IAM app API",
    componentSpecPath:
      "crates/sdkwork-api-clawrouter-assembly/specs/component.spec.json",
    sdkFamily: "sdkwork-iam-app-sdk",
    contract: {
      runtimeMode: "same-origin-mounted",
      cargoDependency: "sdkwork-routes-iam-app-api",
      embeddedExecutableExport: "sdkwork_api_clawrouter_assembly::assemble_api_router",
    },
    sourceEvidence: [
      {
        path: "crates/sdkwork-api-clawrouter-assembly/src/bootstrap.rs",
        requiredText: [
          "iam::wire_iam_app_router().await?",
          "with_dependency_api_router(iam_router)",
        ],
      },
      {
        path: "crates/sdkwork-api-clawrouter-assembly/src/bootstrap/iam.rs",
        requiredText: [
          "sdkwork_routes_iam_app_api::build_sdkwork_iam_app_api_router()",
        ],
      },
      {
        path: "crates/sdkwork-api-clawrouter-assembly/Cargo.toml",
        requiredText: ["sdkwork-routes-iam-app-api.workspace = true"],
      },
    ],
  },
  membership: {
    label: "Membership app API",
    componentSpecPath:
      "crates/sdkwork-routes-clawrouter-app-api/specs/component.spec.json",
    sdkFamily: "sdkwork-membership-app-sdk",
    contract: {
      runtimeMode: "same-origin-mounted",
      cargoDependency: "sdkwork_routes_membership_app_api",
      embeddedExecutableExport:
        "sdkwork_routes_membership_app_api::app_membership_router_with_sqlite_pool",
    },
    sourceEvidence: [
      {
        path: "crates/sdkwork-routes-clawrouter-app-api/src/routes.rs",
        requiredText: [
          "crate::commerce_runtime::merge_federated_commerce_app_routers(",
        ],
      },
      {
        path: "crates/sdkwork-routes-clawrouter-app-api/src/commerce_runtime.rs",
        requiredText: [
          "app_membership_router_with_postgres_pool",
          "app_membership_router_with_sqlite_pool",
          "let membership_router = build_membership_router_from_pool(",
          "merge_federated_app_capability_router_with_optional_auth(",
        ],
      },
      {
        path: "crates/sdkwork-routes-clawrouter-app-api/Cargo.toml",
        requiredText: ["sdkwork_routes_membership_app_api.workspace = true"],
      },
    ],
  },
};

const TARGETS = [
  {
    surface: "app-api",
    manifestPath:
      "sdks/_route-manifests/app-api/sdkwork-routes-clawrouter-app-api.route-manifest.json",
    outputPath: "crates/sdkwork-routes-clawrouter-app-api/src/http_route_manifest.rs",
    mergeAppbaseIamRoutes: true,
    mergeMembershipRoutes: true,
  },
  {
    surface: "backend-api",
    manifestPath:
      "sdks/_route-manifests/backend-api/sdkwork-routes-clawrouter-backend-api.route-manifest.json",
    outputPath: "crates/sdkwork-routes-clawrouter-backend-api/src/http_route_manifest.rs",
    mergeAppbaseIamRoutes: false,
  },
];

const METHOD_MAP = {
  GET: "Get",
  POST: "Post",
  PUT: "Put",
  PATCH: "Patch",
  DELETE: "Delete",
};

const AUTH_BUILDER = {
  public: "public",
  "dual-token": "dual_token",
  "api-key": "api_key",
  oauth: "oauth",
  openApiFlexible: "open_api_flexible",
};

const RUSTFMT_FN_CALL_WIDTH = 60;

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    check: argv.includes("--check") || !argv.includes("--apply"),
  };
}

function escapeRustString(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function routeEntry(route) {
  const method = METHOD_MAP[route.method];
  if (!method) {
    throw new Error(`unsupported HTTP method ${route.method} for ${route.path}`);
  }
  const authMode = route.auth?.mode ?? "dual-token";
  const builder = AUTH_BUILDER[authMode];
  if (!builder) {
    throw new Error(`unsupported auth mode ${authMode} for ${route.path}`);
  }
  const tag = Array.isArray(route.tags) && route.tags.length > 0 ? route.tags[0] : "router";
  const operationId =
    route.operationId ??
    `${route.method.toLowerCase()}.${route.path.replace(/[{}]/g, "").replaceAll("/", ".")}`;
  const args = [
    `HttpMethod::${method}`,
    `"${escapeRustString(route.path)}"`,
    `"${escapeRustString(tag)}"`,
    `"${escapeRustString(operationId)}"`,
  ].join(", ");
  const entry = `    HttpRoute::${builder}(${args}),`;
  if (args.length <= RUSTFMT_FN_CALL_WIDTH) {
    return entry;
  }
  return `    HttpRoute::${builder}(
        HttpMethod::${method},
        "${escapeRustString(route.path)}",
        "${escapeRustString(tag)}",
        "${escapeRustString(operationId)}",
    ),`;
}

async function readAppbaseIamRouteEntries() {
  const source = await readFile(APPBASE_IAM_MANIFEST_PATH, "utf8");
  const match = source.match(/const IAM_APP_API_ROUTES: &\[HttpRoute\] = &\[([\s\S]*?)\];/);
  if (!match) {
    throw new Error(
      `failed to parse IAM_APP_API_ROUTES from ${APPBASE_IAM_MANIFEST_PATH}`,
    );
  }
  return `    ${match[1].trim()}`;
}

async function readMembershipAppRouteEntries() {
  const source = await readFile(MEMBERSHIP_APP_MANIFEST_PATH, "utf8");
  const match = source.match(
    /pub const APP_API_HTTP_ROUTE_MANIFEST: HttpRouteManifest = HttpRouteManifest::new\(&\[([\s\S]*?)\]\);/,
  );
  if (!match) {
    throw new Error(
      `failed to parse APP_API_HTTP_ROUTE_MANIFEST from ${MEMBERSHIP_APP_MANIFEST_PATH}`,
    );
  }
  return `    ${match[1].trim()}`;
}

function listHttpRouteKeys(rustRouteEntries) {
  const keys = new Set();
  const pattern = /HttpRoute::\w+\(\s*HttpMethod::(\w+),\s*"([^"]+)"/g;
  for (const entry of rustRouteEntries.matchAll(pattern)) {
    keys.add(`${entry[1].toUpperCase()} ${entry[2]}`);
  }
  return keys;
}

function filterProductRoutesOverlappingDependencies(productRoutes, dependencyRouteEntries) {
  const dependencyKeys = listHttpRouteKeys(dependencyRouteEntries);
  return productRoutes.filter(
    (route) => !dependencyKeys.has(`${route.method} ${route.path}`),
  );
}

async function assertExecutableDependencyMount(mount) {
  const componentSpecFile = path.join(workspaceRoot, mount.componentSpecPath);
  const componentSpec = JSON.parse(await readFile(componentSpecFile, "utf8"));
  const dependencySurfaces = componentSpec.contracts?.dependencyApiSurfaces;
  if (!Array.isArray(dependencySurfaces)) {
    throw new Error(
      `${mount.label} executable mount check failed: ${mount.componentSpecPath} does not declare contracts.dependencyApiSurfaces`,
    );
  }

  const dependencySurface = dependencySurfaces.find(
    (candidate) => candidate.sdkFamily === mount.sdkFamily,
  );
  if (!dependencySurface) {
    throw new Error(
      `${mount.label} executable mount check failed: ${mount.componentSpecPath} does not declare ${mount.sdkFamily}`,
    );
  }

  for (const [field, expected] of Object.entries(mount.contract)) {
    if (dependencySurface[field] !== expected) {
      throw new Error(
        `${mount.label} executable mount check failed: ${mount.componentSpecPath} requires ${field}=${JSON.stringify(expected)}, found ${JSON.stringify(dependencySurface[field])}`,
      );
    }
  }

  for (const evidence of mount.sourceEvidence) {
    const source = await readFile(path.join(workspaceRoot, evidence.path), "utf8");
    for (const requiredText of evidence.requiredText) {
      if (!source.includes(requiredText)) {
        throw new Error(
          `${mount.label} executable mount check failed: ${evidence.path} is missing ${JSON.stringify(requiredText)}`,
        );
      }
    }
  }
}

async function assertExecutableDependencyMounts(target) {
  if (target.mergeAppbaseIamRoutes) {
    await assertExecutableDependencyMount(EXECUTABLE_DEPENDENCY_MOUNTS.iam);
  }
  if (target.mergeMembershipRoutes) {
    await assertExecutableDependencyMount(EXECUTABLE_DEPENDENCY_MOUNTS.membership);
  }
}

function renderManifest(
  routes,
  { iamRouteEntries = null, membershipRouteEntries = null } = {},
) {
  const dependencyRouteEntries = [iamRouteEntries, membershipRouteEntries]
    .filter(Boolean)
    .join("\n");
  const productRoutes = dependencyRouteEntries
    ? filterProductRoutesOverlappingDependencies(routes, dependencyRouteEntries)
    : routes;
  const productEntries = productRoutes.map(routeEntry).join("\n");
  const routeBlock = dependencyRouteEntries
    ? `${dependencyRouteEntries}\n${productEntries}`
    : productEntries;
  const publicBootstrapTests = iamRouteEntries
    ? `
    #[test]
    fn iam_bootstrap_routes_allow_anonymous_access() {
        assert_public_route("POST", "/app/v3/api/auth/sessions");
        assert_public_route("POST", "/app/v3/api/oauth/device_authorizations");
        assert_public_route("GET", "/app/v3/api/system/iam/runtime");
    }

    #[test]
    fn order_assembly_routes_are_materialized() {
        let aggregate = super::http_route_manifest();
        let order = sdkwork_api_order_assembly::ApiAssembly::app_route_manifest();

        for dependency_route in order.routes() {
            let route = aggregate
                .routes()
                .iter()
                .find(|route| {
                    route.method == dependency_route.method && route.path == dependency_route.path
                })
                .unwrap_or_else(|| {
                    panic!(
                        "Order assembly route {:?} {} must be materialized",
                        dependency_route.method, dependency_route.path
                    )
                });
            assert_eq!(dependency_route.operation_id, route.operation_id);
            assert_eq!(dependency_route.auth, route.auth);
        }
        assert_eq!(41, order.routes().len());
    }
`
  : "";
  const appManifestAlias = iamRouteEntries
    ? `
/// Product app-api manifest including appbase IAM bootstrap/auth/oauth metadata.
pub fn claw_router_app_http_route_manifest() -> HttpRouteManifest {
    http_route_manifest()
}
`
    : "";
  const appManifestTests = iamRouteEntries
    ? `
#[cfg(test)]
mod tests {
    use sdkwork_web_contract::RouteAuth;
    use sdkwork_web_core::{resolve_public_path, WebRequestContextProfile};

    fn assert_public_route(method: &str, path: &str) {
        let manifest = super::http_route_manifest();
        let route = manifest
            .match_route(method, path)
            .unwrap_or_else(|| panic!("{method} {path} must be registered"));
        assert_eq!(
            RouteAuth::Public,
            route.auth,
            "{method} {path} must be public"
        );
        assert!(
            resolve_public_path(
                method,
                path,
                &WebRequestContextProfile::default(),
                Some(manifest),
            ),
            "{method} {path} must resolve as a public path",
        );
    }

    #[test]
    fn public_catalog_routes_allow_anonymous_access() {
        assert_public_route("GET", "/app/v3/api/ai/models");
        assert_public_route("GET", "/app/v3/api/ai/model_rankings");
        assert_public_route("GET", "/app/v3/api/ai/model_vendors");
        assert_public_route("GET", "/app/v3/api/system/site/runtime");
    }

    #[test]
    fn membership_catalog_routes_allow_anonymous_access() {
        assert_public_route("GET", "/app/v3/api/memberships/plans");
        assert_public_route("GET", "/app/v3/api/memberships/benefits");
        assert_public_route("GET", "/app/v3/api/memberships/packages");
        assert_public_route("GET", "/app/v3/api/memberships/packages/{packageId}");
        assert_public_route("GET", "/app/v3/api/memberships/package_groups");
        assert_public_route(
            "GET",
            "/app/v3/api/memberships/package_groups/{packageGroupId}",
        );
        assert_public_route(
            "GET",
            "/app/v3/api/memberships/package_groups/{packageGroupId}/packages",
        );
    }
${publicBootstrapTests}}
`
    : "";

  return `// @generated by tools/generate-clawrouter-http-route-manifest-rs.mjs — do not edit

use sdkwork_web_contract::{HttpMethod, HttpRoute};
use sdkwork_web_core::HttpRouteManifest;

const HTTP_ROUTES: &[HttpRoute] = &[
${routeBlock}
];

pub fn http_route_manifest() -> HttpRouteManifest {
    HttpRouteManifest::new(HTTP_ROUTES)
}
${appManifestAlias}${appManifestTests}
`.trimEnd() + "\n";
}

async function processTarget(target, mode) {
  await assertExecutableDependencyMounts(target);
  const manifest = JSON.parse(
    await readFile(path.join(workspaceRoot, target.manifestPath), "utf8"),
  );
  const iamRouteEntries = target.mergeAppbaseIamRoutes
    ? await readAppbaseIamRouteEntries()
    : null;
  const membershipRouteEntries = target.mergeMembershipRoutes
    ? await readMembershipAppRouteEntries()
    : null;
  const content = renderManifest(manifest.routes, {
    iamRouteEntries,
    membershipRouteEntries,
  });
  const outputPath = path.join(workspaceRoot, target.outputPath);
  let existing = null;
  try {
    existing = await readFile(outputPath, "utf8");
  } catch {
    existing = null;
  }
  if (existing === content) {
    return {
      surface: target.surface,
      status: "ok",
      routeCount: manifest.routes.length,
      iamRouteCount: iamRouteEntries ? listHttpRouteKeys(iamRouteEntries).size : 0,
      membershipRouteCount: membershipRouteEntries
        ? listHttpRouteKeys(membershipRouteEntries).size
        : 0,
    };
  }
  if (mode.check) {
    return {
      surface: target.surface,
      status: "drift",
      routeCount: manifest.routes.length,
      iamRouteCount: iamRouteEntries ? listHttpRouteKeys(iamRouteEntries).size : 0,
      membershipRouteCount: membershipRouteEntries
        ? listHttpRouteKeys(membershipRouteEntries).size
        : 0,
    };
  }
  await writeFile(outputPath, content, "utf8");
  return {
    surface: target.surface,
    status: "wrote",
    routeCount: manifest.routes.length,
    iamRouteCount: iamRouteEntries ? listHttpRouteKeys(iamRouteEntries).size : 0,
    membershipRouteCount: membershipRouteEntries
      ? listHttpRouteKeys(membershipRouteEntries).size
      : 0,
  };
}

async function main() {
  const mode = parseArgs(process.argv.slice(2));
  const summaries = [];
  for (const target of TARGETS) {
    summaries.push(await processTarget(target, mode));
  }
  for (const summary of summaries) {
    const iamSuffix =
      summary.iamRouteCount > 0 ? ` iamRoutes=${summary.iamRouteCount}` : "";
    const membershipSuffix = summary.membershipRouteCount > 0
      ? ` membershipRoutes=${summary.membershipRouteCount}`
      : "";
    console.log(
      `[${summary.surface}] routes=${summary.routeCount}${iamSuffix}${membershipSuffix} status=${summary.status}`,
    );
  }
  if (mode.check && summaries.some((summary) => summary.status === "drift")) {
    console.error("Generated http_route_manifest.rs files are out of date.");
    process.exitCode = 1;
  }
}

await main();
