#!/usr/bin/env node
/**
 * Bootstrap T1 commerce capability sibling repos and move domain service crates
 * from sdkwork-commerce. Run from sdkwork-commerce root:
 *   node tools/bootstrap_commerce_capability_repos.mjs
 *   node tools/bootstrap_commerce_capability_repos.mjs order payment
 */
import { access, cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const commerceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(commerceRoot, "..");

const ALL_CAPABILITIES = [
  {
    id: "inventory",
    port: 18092,
    apiSegment: "inventory",
    serviceCrate: "sdkwork-commerce-inventory-service",
    extraCrates: [],
  },
  {
    id: "order",
    port: 18093,
    apiSegment: "orders",
    serviceCrate: "sdkwork-commerce-order-service",
    extraCrates: [],
  },
  {
    id: "payment",
    port: 18094,
    apiSegment: "payments",
    serviceCrate: "sdkwork-commerce-payment-service",
    extraCrates: [],
  },
  {
    id: "account",
    port: 18095,
    apiSegment: "wallet",
    serviceCrate: "sdkwork-commerce-account-service",
    extraCrates: [],
  },
  {
    id: "membership",
    port: 18096,
    apiSegment: "membership",
    serviceCrate: "sdkwork-commerce-membership-service",
    extraCrates: ["sdkwork-commerce-membership-repository-sqlx"],
  },
  {
    id: "promotion",
    port: 18097,
    apiSegment: "coupons",
    serviceCrate: "sdkwork-commerce-promotion-service",
    extraCrates: [],
  },
  {
    id: "invoice",
    port: 18098,
    apiSegment: "invoices",
    serviceCrate: "sdkwork-commerce-invoice-service",
    extraCrates: [],
  },
  {
    id: "catalog",
    port: 18099,
    apiSegment: "catalog",
    serviceCrate: null,
    extraCrates: [],
    browseOnly: true,
  },
];

function pascal(id) {
  return id.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());
}

function snake(id) {
  return id.replace(/-/g, "_");
}

function upper(id) {
  return id.replace(/-/g, "_").toUpperCase();
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function write(relativePath, content, repoRoot) {
  const fullPath = path.join(repoRoot, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf8");
}

function workspaceCargoToml(cap) {
  const id = cap.id;
  const Cap = pascal(id);
  const env = upper(id);
  const serviceKey = cap.serviceCrate
    ? `sdkwork_commerce_${snake(id)}_service`
    : null;
  const repoKey = `sdkwork_commerce_${snake(id)}_repository_sqlx`;
  const lines = [
    "[workspace]",
    'resolver = "2"',
    "members = [",
    ...(cap.serviceCrate
      ? [`  "crates/${cap.serviceCrate}",`]
      : []),
    `  "crates/sdkwork-commerce-${id}-repository-sqlx",`,
    `  "crates/sdkwork-routes-${id}-app-api",`,
    `  "crates/sdkwork-routes-${id}-backend-api",`,
    `  "crates/sdkwork-${id}-database-host",`,
    `  "crates/sdkwork-${id}-service-host",`,
    `  "crates/sdkwork-${id}-api-server",`,
    ...cap.extraCrates.map((c) => `  "crates/${c}",`),
    "]",
    "",
    "[workspace.package]",
    'edition = "2021"',
    'version = "0.1.0"',
    'license = "UNLICENSED"',
    "publish = false",
    "",
    "[workspace.dependencies]",
    'axum = "0.8"',
    'tokio = { version = "1.51", features = ["macros", "rt-multi-thread", "net", "sync"] }',
    'serde = { version = "1", features = ["derive"] }',
    'serde_json = "1"',
    'sqlx = { version = "0.8", default-features = false, features = ["runtime-tokio", "postgres", "sqlite", "uuid", "chrono"] }',
    'uuid = { version = "1", features = ["v4", "serde"] }',
    'chrono = { version = "0.4", features = ["serde"] }',
    'tower = "0.5"',
    'tower-http = { version = "0.5", features = ["cors", "trace"] }',
    'tracing = "0.1"',
    'tracing-subscriber = "0.3"',
    'dotenvy = "0.15"',
    'thiserror = "1"',
    'async-trait = "0.1"',
    "sdkwork_commerce_contract_service = { path = \"../sdkwork-commerce/crates/sdkwork-commerce-contract-service\", package = \"sdkwork-commerce-contract-service\" }",
    'sdkwork-web-core = { path = "../sdkwork-web-framework/crates/sdkwork-web-core" }',
    'sdkwork-web-axum = { path = "../sdkwork-web-framework/crates/sdkwork-web-axum" }',
    'sdkwork-web-contract = { path = "../sdkwork-web-framework/crates/sdkwork-web-contract" }',
    'sdkwork-iam-web-adapter = { path = "../sdkwork-iam/crates/sdkwork-iam-web-adapter" }',
    "sdkwork_iam_context_service = { path = \"../sdkwork-iam/crates/sdkwork-iam-context-service\", package = \"sdkwork-iam-context-service\" }",
    'sdkwork-database-config = { path = "../sdkwork-database/crates/sdkwork-database-config" }',
    'sdkwork-database-lifecycle = { path = "../sdkwork-database/crates/sdkwork-database-lifecycle" }',
    'sdkwork-database-spi = { path = "../sdkwork-database/crates/sdkwork-database-spi" }',
    'sdkwork-database-sqlx = { path = "../sdkwork-database/crates/sdkwork-database-sqlx" }',
    "sdkwork_database_config = { path = \"../sdkwork-database/crates/sdkwork-database-config\", package = \"sdkwork-database-config\" }",
    "sdkwork_database_lifecycle = { path = \"../sdkwork-database/crates/sdkwork-database-lifecycle\", package = \"sdkwork-database-lifecycle\" }",
    "sdkwork_database_spi = { path = \"../sdkwork-database/crates/sdkwork-database-spi\", package = \"sdkwork-database-spi\" }",
    "sdkwork_database_sqlx = { path = \"../sdkwork-database/crates/sdkwork-database-sqlx\", package = \"sdkwork-database-sqlx\" }",
  ];
  if (serviceKey) {
    lines.push(
      `${serviceKey} = { path = "crates/${cap.serviceCrate}", package = "${cap.serviceCrate}" }`,
    );
  }
  if (cap.browseOnly) {
    lines.push(
      'sdkwork_commerce_merchandise_service = { path = "../sdkwork-merchandise/crates/sdkwork-commerce-merchandise-service", package = "sdkwork-commerce-merchandise-service" }',
      'sdkwork_commerce_merchandise_repository_sqlx = { path = "../sdkwork-merchandise/crates/sdkwork-commerce-merchandise-repository-sqlx", package = "sdkwork-commerce-merchandise-repository-sqlx" }',
      'sdkwork_routes_merchandise_app_api = { path = "../sdkwork-merchandise/crates/sdkwork-routes-merchandise-app-api", package = "sdkwork-routes-merchandise-app-api" }',
    );
  }
  lines.push(
    `${repoKey} = { path = "crates/sdkwork-commerce-${id}-repository-sqlx", package = "sdkwork-commerce-${id}-repository-sqlx" }`,
    `sdkwork_routes_${snake(id)}_app_api = { path = "crates/sdkwork-routes-${id}-app-api", package = "sdkwork-routes-${id}-app-api" }`,
    `sdkwork_routes_${snake(id)}_backend_api = { path = "crates/sdkwork-routes-${id}-backend-api", package = "sdkwork-routes-${id}-backend-api" }`,
    `sdkwork_${snake(id)}_database_host = { path = "crates/sdkwork-${id}-database-host", package = "sdkwork-${id}-database-host" }`,
    `sdkwork_${snake(id)}_service_host = { path = "crates/sdkwork-${id}-service-host", package = "sdkwork-${id}-service-host" }`,
    "",
  );
  return lines.join("\n");
}

async function scaffoldRepo(cap) {
  const id = cap.id;
  const Cap = pascal(id);
  const env = upper(id);
  const repoRoot = path.join(workspaceRoot, `sdkwork-${id}`);
  if (await exists(path.join(repoRoot, "Cargo.toml"))) {
    console.log(`skip scaffold (exists): sdkwork-${id}`);
    return repoRoot;
  }

  console.log(`scaffold: sdkwork-${id}`);
  await mkdir(repoRoot, { recursive: true });
  await write("Cargo.toml", workspaceCargoToml(cap), repoRoot);
  await write(
    "AGENTS.md",
    `# Repository Guidelines

## SDKWORK Soul

Read \`../sdkwork-specs/SOUL.md\` before executing tasks in this root.

## Capability Identity

- Domain: \`commerce\`
- Capability: \`${id}\`
- Table prefix: \`commerce_\`
- App API prefix: \`/app/v3/api/${cap.apiSegment}\`
- Backend API prefix: \`/backend/v3/api/${cap.apiSegment}\`

Commerce platform consumes this repo via sibling \`Cargo.toml [workspace.dependencies]\` paths. Do not duplicate these crates under \`sdkwork-commerce/crates/\`.

## Verification

\`\`\`bash
cargo test --workspace
\`\`\`
`,
    repoRoot,
  );
  for (const shim of ["CLAUDE.md", "GEMINI.md", "CODEX.md"]) {
    await write(shim, `# Compatibility Shim\n\nRead \`AGENTS.md\`.\n`, repoRoot);
  }
  await write(
    "README.md",
    `# sdkwork-${id}\n\nSDKWork commerce **${id}** capability building-block repository.\n`,
    repoRoot,
  );
  await write(
    "specs/component.spec.json",
    `${JSON.stringify(
      {
        schemaVersion: 1,
        kind: "sdkwork.component.spec",
        component: {
          name: `sdkwork-${id}-workspace`,
          domain: "commerce",
          capability: id,
          root: `sdkwork-${id}`,
        },
      },
      null,
      2,
    )}\n`,
    repoRoot,
  );

  if (!cap.serviceCrate) {
    await write(
      `crates/sdkwork-commerce-${id}-repository-sqlx/Cargo.toml`,
      `[package]
name = "sdkwork-commerce-${id}-repository-sqlx"
version.workspace = true
edition.workspace = true
license.workspace = true
publish.workspace = true

[lib]
path = "src/lib.rs"

[dependencies]
sdkwork_commerce_contract_service.workspace = true
sdkwork_commerce_merchandise_repository_sqlx.workspace = true
`,
      repoRoot,
    );
    await write(
      `crates/sdkwork-commerce-${id}-repository-sqlx/src/lib.rs`,
      `pub use sdkwork_commerce_merchandise_repository_sqlx::{
    PostgresCommerceCatalogStore, SqliteCommerceCatalogStore,
};
`,
      repoRoot,
    );
  } else {
    await write(
      `crates/sdkwork-commerce-${id}-repository-sqlx/Cargo.toml`,
      `[package]
name = "sdkwork-commerce-${id}-repository-sqlx"
version.workspace = true
edition.workspace = true
license.workspace = true
publish.workspace = true

[lib]
path = "src/lib.rs"

[dependencies]
sdkwork_commerce_contract_service.workspace = true
sdkwork_commerce_${snake(id)}_service.workspace = true
`,
      repoRoot,
    );
    await write(
      `crates/sdkwork-commerce-${id}-repository-sqlx/src/lib.rs`,
      `#[cfg(test)]
mod tests {
    #[test]
    fn repository_crate_name_is_stable() {
        let _ = env!("CARGO_PKG_NAME");
    }
}
`,
      repoRoot,
    );
  }

  const routerDeps = cap.browseOnly
    ? `sdkwork_routes_merchandise_app_api.workspace = true
sdkwork_commerce_merchandise_service.workspace = true`
    : cap.serviceCrate
      ? `sdkwork_commerce_${snake(id)}_service.workspace = true
sdkwork_${snake(id)}_service_host.workspace = true`
      : "";

  for (const surface of ["app", "backend"]) {
    await write(
      `crates/sdkwork-routes-${id}-${surface}-api/Cargo.toml`,
      `[package]
name = "sdkwork-routes-${id}-${surface}-api"
version.workspace = true
edition.workspace = true
license.workspace = true
publish.workspace = true

[lib]
path = "src/lib.rs"

[dependencies]
axum = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
${routerDeps}
sdkwork-web-core.workspace = true
sdkwork-web-axum.workspace = true
sdkwork-iam-web-adapter.workspace = true
`,
      repoRoot,
    );
    await write(
      `crates/sdkwork-routes-${id}-${surface}-api/src/lib.rs`,
      surface === "app"
        ? `pub mod routes;
pub mod web_bootstrap;

pub use routes::build_${id}_app_router_with_framework;
pub use web_bootstrap::wrap_router_with_web_framework_from_env;
`
        : `pub mod routes;
pub mod web_bootstrap;

pub use routes::build_${id}_backend_router_with_framework;
`,
      repoRoot,
    );
    await write(
      `crates/sdkwork-routes-${id}-${surface}-api/src/routes.rs`,
      surface === "app"
        ? `use axum::routing::get;
use axum::Router;
use std::sync::Arc;
use sdkwork_${snake(id)}_service_host::${Cap}ServiceHost;

pub fn build_${id}_app_router(_host: Arc<${Cap}ServiceHost>) -> Router {
    Router::new().route(
        "/app/v3/api/${cap.apiSegment}/health",
        get(|| async { "ok" }),
    )
}

pub async fn build_${id}_app_router_with_framework(host: Arc<${Cap}ServiceHost>) -> Router {
    crate::web_bootstrap::wrap_router_with_web_framework_from_env(build_${id}_app_router(host)).await
}
`
        : `use axum::routing::get;
use axum::Router;
use std::sync::Arc;
use sdkwork_${snake(id)}_service_host::${Cap}ServiceHost;

pub fn build_${id}_backend_router(_host: Arc<${Cap}ServiceHost>) -> Router {
    Router::new().route(
        "/backend/v3/api/${cap.apiSegment}/health",
        get(|| async { "ok" }),
    )
}

pub async fn build_${id}_backend_router_with_framework(host: Arc<${Cap}ServiceHost>) -> Router {
    build_${id}_backend_router(host)
}
`,
      repoRoot,
    );
    await write(
      `crates/sdkwork-routes-${id}-${surface}-api/src/web_bootstrap.rs`,
      `use axum::Router;
use sdkwork_iam_web_adapter::IamWebRequestContextResolver;
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_core::WebRequestContextProfile;

pub async fn wrap_router_with_web_framework_from_env(router: Router) -> Router {
    let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
    let layer = WebFrameworkLayer::new(resolver).with_profile(WebRequestContextProfile {
        public_path_prefixes: vec!["/health".to_owned(), "/ready".to_owned()],
        ..WebRequestContextProfile::default()
    });
    with_web_request_context(router, layer)
}
`,
      repoRoot,
    );
  }

  await write(
    `crates/sdkwork-${id}-database-host/Cargo.toml`,
    `[package]
name = "sdkwork-${id}-database-host"
version.workspace = true
edition.workspace = true
license.workspace = true
publish.workspace = true

[lib]
path = "src/lib.rs"

[dependencies]
dotenvy = { workspace = true }
sdkwork_database_config.workspace = true
sdkwork_database_lifecycle.workspace = true
sdkwork_database_spi.workspace = true
sdkwork_database_sqlx.workspace = true
`,
    repoRoot,
  );
  await write(
    `crates/sdkwork-${id}-database-host/src/lib.rs`,
    `use std::path::PathBuf;
use std::sync::Arc;
use sdkwork_database_config::DatabaseConfig;
use sdkwork_database_lifecycle::{lifecycle_options_from_env, LifecycleOrchestrator};
use sdkwork_database_spi::{DatabaseAssetProvider, DatabaseManifest, DefaultDatabaseModule};
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool};

pub struct ${Cap}DatabaseHost {
    pool: DatabasePool,
    module: Arc<DefaultDatabaseModule>,
}

impl ${Cap}DatabaseHost {
    pub fn pool(&self) -> &DatabasePool {
        &self.pool
    }

    pub fn module(&self) -> Arc<DefaultDatabaseModule> {
        self.module.clone()
    }
}

pub async fn bootstrap_${snake(id)}_database_from_env() -> Result<${Cap}DatabaseHost, String> {
    let _ = dotenvy::dotenv();
    let config = DatabaseConfig::from_env("${env}")
        .map_err(|error| format!("read ${id} database config failed: {error}"))?;
    let pool = create_pool_from_config(config)
        .await
        .map_err(|error| format!("create ${id} database pool failed: {error}"))?;
    let app_root = std::env::var("SDKWORK_${env}_APP_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."));
    let module = Arc::new(
        DefaultDatabaseModule::from_app_root(&app_root)
            .map_err(|error| format!("load ${id} database module failed: {error}"))?,
    );
    let manifest = DatabaseManifest::from_file(module.manifest_path())
        .map_err(|error| format!("read ${id} database manifest failed: {error}"))?;
    let options = lifecycle_options_from_env("${env}", &manifest);
    let orchestrator =
        LifecycleOrchestrator::new(pool.clone(), module.clone()).with_applied_by("sdkwork-${id}");
    orchestrator.init().await.map_err(|e| format!("{e}"))?;
    if options.auto_migrate {
        orchestrator.migrate().await.map_err(|e| format!("{e}"))?;
    }
    Ok(${Cap}DatabaseHost { pool, module })
}
`,
    repoRoot,
  );

  await write(
    `crates/sdkwork-${id}-service-host/Cargo.toml`,
    `[package]
name = "sdkwork-${id}-service-host"
version.workspace = true
edition.workspace = true
license.workspace = true
publish.workspace = true

[lib]
path = "src/lib.rs"

[dependencies]
sdkwork_database_sqlx.workspace = true
sdkwork_${snake(id)}_database_host.workspace = true
`,
    repoRoot,
  );
  await write(
    `crates/sdkwork-${id}-service-host/src/lib.rs`,
    `use sdkwork_database_sqlx::DatabasePool;
use sdkwork_${snake(id)}_database_host::{bootstrap_${snake(id)}_database_from_env, ${Cap}DatabaseHost};

pub struct ${Cap}ServiceHost {
    database: ${Cap}DatabaseHost,
}

impl ${Cap}ServiceHost {
    pub async fn new() -> Self {
        Self::from_env().await.expect("${id} service host bootstrap failed")
    }

    pub async fn from_env() -> Result<Self, String> {
        let database = bootstrap_${snake(id)}_database_from_env().await?;
        Ok(Self { database })
    }

    pub fn database_pool(&self) -> &DatabasePool {
        self.database.pool()
    }

    pub fn database_module(&self) -> std::sync::Arc<sdkwork_database_spi::DefaultDatabaseModule> {
        self.database.module()
    }
}
`,
    repoRoot,
  );

  await write(
    `crates/sdkwork-${id}-api-server/Cargo.toml`,
    `[package]
name = "sdkwork-${id}-api-server"
version.workspace = true
edition.workspace = true
license.workspace = true
publish.workspace = true

[[bin]]
name = "${id}-server"
path = "src/main.rs"

[lib]
path = "src/lib.rs"

[dependencies]
axum = { workspace = true }
tokio = { workspace = true }
tower-http = { workspace = true }
tracing = { workspace = true }
tracing-subscriber = { workspace = true }
sdkwork_routes_${snake(id)}_app_api.workspace = true
sdkwork_routes_${snake(id)}_backend_api.workspace = true
sdkwork_${snake(id)}_service_host.workspace = true
`,
    repoRoot,
  );
  await write(
    `crates/sdkwork-${id}-api-server/src/lib.rs`,
    `use axum::Router;
use axum::routing::get;

pub fn ${snake(id)}_health_router() -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/ready", get(|| async { "ready" }))
}
`,
    repoRoot,
  );
  await write(
    `crates/sdkwork-${id}-api-server/src/main.rs`,
    `use axum::Router;
use sdkwork_routes_${snake(id)}_app_api::build_${id}_app_router_with_framework;
use sdkwork_routes_${snake(id)}_backend_api::build_${id}_backend_router_with_framework;
use sdkwork_${snake(id)}_api_server::${snake(id)}_health_router;
use sdkwork_${snake(id)}_service_host::${Cap}ServiceHost;
use std::sync::Arc;
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    let host = Arc::new(${Cap}ServiceHost::new().await);
    let app = Router::new()
        .merge(${snake(id)}_health_router())
        .merge(build_${id}_app_router_with_framework(host.clone()).await)
        .merge(build_${id}_backend_router_with_framework(host).await)
        .layer(CorsLayer::permissive());
    let addr = std::env::var("${env}_API_BIND").unwrap_or_else(|_| "0.0.0.0:${cap.port}".to_owned());
    let listener = tokio::net::TcpListener::bind(&addr).await.expect("bind");
    axum::serve(listener, app).await.expect("serve");
}
`,
    repoRoot,
  );

  return repoRoot;
}

async function moveCrate(crateName, repoRoot) {
  const from = path.join(commerceRoot, "crates", crateName);
  const to = path.join(repoRoot, "crates", crateName);
  if (!(await exists(from))) {
    console.log(`skip move (missing in commerce): ${crateName}`);
    return;
  }
  if (await exists(to)) {
    console.log(`skip move (already in sibling): ${crateName}`);
    return;
  }
  await cp(from, to, { recursive: true });
  await updateServiceCargoToml(to);
  console.log(`moved: ${crateName} -> sdkwork-${path.basename(repoRoot)}`);
}

async function updateServiceCargoToml(crateDir) {
  const cargoPath = path.join(crateDir, "Cargo.toml");
  if (!(await exists(cargoPath))) {
    return;
  }
  let content = await readFile(cargoPath, "utf8");
  content = content.replace(/^version = .+$/m, "version.workspace = true");
  content = content.replace(/^license = .+$/m, "license.workspace = true");
  if (!content.includes("publish.workspace")) {
    content = content.replace(/(\[package\][^\n]*\n)/, "$1publish.workspace = true\n");
  }
  await writeFile(cargoPath, content, "utf8");
}

async function removeCommerceCrate(crateName) {
  const from = path.join(commerceRoot, "crates", crateName);
  if (await exists(from)) {
    const { rm } = await import("node:fs/promises");
    await rm(from, { recursive: true, force: true });
    console.log(`removed from commerce: ${crateName}`);
  }
}

async function main() {
  const selected = process.argv.slice(2);
  const caps = selected.length
    ? ALL_CAPABILITIES.filter((c) => selected.includes(c.id))
    : ALL_CAPABILITIES;

  for (const cap of caps) {
    const repoRoot = await scaffoldRepo(cap);
    if (cap.serviceCrate) {
      await moveCrate(cap.serviceCrate, repoRoot);
      await removeCommerceCrate(cap.serviceCrate);
    }
    for (const extra of cap.extraCrates) {
      await moveCrate(extra, repoRoot);
      await removeCommerceCrate(extra);
    }
  }

  console.log("done — update sdkwork-commerce/Cargo.toml sibling paths next");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
