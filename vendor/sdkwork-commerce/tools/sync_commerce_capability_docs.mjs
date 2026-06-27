#!/usr/bin/env node
/**
 * Sync Canon PRD, TECH_ARCHITECTURE, README, and AGENTS doc links for commerce
 * T1 capability repos and refresh sdkwork-commerce platform Canon docs.
 *
 * Usage (from sdkwork-commerce root):
 *   node tools/sync_commerce_capability_docs.mjs
 *   node tools/sync_commerce_capability_docs.mjs shop order payment
 */
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const commerceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(commerceRoot, "..");
const updated = "2026-06-24";
const owner = "SDKWork maintainers";

const CAPABILITIES = [
  {
    id: "shop",
    name: "Shop",
    status: "active",
    migration: "complete",
    appApi: "/app/v3/api/shops",
    backendApi: "/backend/v3/api/shops",
    serviceCrate: "sdkwork-commerce-shop-service",
    repositoryCrate: "sdkwork-commerce-shop-repository-sqlx",
    routerCrates: [
      "sdkwork-routes-shop-app-api",
      "sdkwork-routes-shop-backend-api",
    ],
    hasPcApp: true,
    verify: ["pnpm verify", "pnpm db:validate", "cargo test --workspace"],
    problem:
      "Merchants need an authoritative shop profile, deposit account, and onboarding lifecycle isolated from the commerce platform composition layer.",
    users:
      "Merchant operators, commerce platform integrators, and SDK consumers building shop admin or storefront experiences.",
    goals: [
      "Own shop domain service, SQL repositories, and HTTP routers for app and backend surfaces.",
      "Expose stable Rust crates consumed by `sdkwork-commerce` through sibling path dependencies.",
      "Support merchant onboarding, shop metadata, and deposit account review flows with tenant-scoped data.",
    ],
    nonGoals: [
      "IAM login, session issuance, or gateway routing (owned by appbase / commerce T0).",
      "Duplicating shop domain logic inside `sdkwork-commerce/crates/`.",
      "End-user mall storefront (see `sdkwork-mall` sibling application).",
    ],
    scope: [
      "Shop CRUD and lifecycle for merchant tenants.",
      "Deposit account onboarding and review.",
      "Backend admin shop operations.",
      "Shop-owned SQL migrations and repository contracts.",
    ],
    scenarios: [
      "A merchant operator creates a shop, submits deposit account details, and an admin approves the account.",
      "Commerce T0 composes shop app routes with IAM identity middleware while route handlers execute in this repository.",
      "An integrator consumes generated commerce SDK shop operations against the composed gateway surface.",
    ],
    metrics: [
      "Shop API operations remain available through composed commerce OpenAPI and SDK smoke tests.",
      "`cargo test --workspace` passes with zero local shop service duplicates in commerce.",
      "Database migrations validate through `pnpm db:validate`.",
    ],
    phases: [
      "Phase 1 (complete): domain service, SQL, and HTTP routers owned in this repository.",
      "Phase 2 (complete): shop/catalog adapter boundaries aligned with merchandise and catalog split.",
    ],
    openQuestions: [
      "Whether shop PC app ships from this repo or a dedicated app root before production launch.",
    ],
  },
  {
    id: "merchandise",
    name: "Merchandise",
    status: "active",
    migration: "complete",
    appApi: null,
    backendApi: "/backend/v3/api/catalog",
    serviceCrate: "sdkwork-commerce-merchandise-service",
    repositoryCrate: "sdkwork-commerce-merchandise-repository-sqlx",
    routerCrates: ["sdkwork-routes-merchandise-app-api"],
    hasPcApp: true,
    verify: ["pnpm verify", "cargo test --workspace"],
    problem:
      "Product master data (SPU/SKU, catalog admin) must be owned by a dedicated merchandise capability rather than a monolithic commerce crate.",
    users:
      "Merchant catalog administrators, commerce operators, and integrators publishing or maintaining product master data.",
    goals: [
      "Own merchandise catalog SQL, domain commands/queries, and backend admin catalog HTTP routers.",
      "Provide backend admin catalog surfaces consumed by commerce T0 with IAM wrappers.",
      "Keep table prefix and API naming aligned with commerce domain standards.",
    ],
    nonGoals: [
      "Public browse/open catalog routes (owned by `sdkwork-catalog`).",
      "Shop deposit or order lifecycle.",
      "Hand-written HTTP bypassing generated SDK contracts.",
    ],
    scope: [
      "SPU/SKU catalog master data and backend admin mutations.",
      "Backend catalog list/create/update routes.",
      "Merchandise repository SQLx implementations and shared catalog store trait.",
    ],
    scenarios: [
      "A catalog admin creates an SPU with SKUs and publishes it to the tenant catalog.",
      "Shop routes in commerce consume merchandise catalog store traits for product coupling.",
      "OpenAPI and SDK generation include catalog operations through commerce composed surfaces.",
    ],
    metrics: [
      "Catalog routes pass commerce api-server integration tests via thin IAM wrappers.",
      "No local `sdkwork-commerce-catalog-service` duplicate in commerce workspace.",
    ],
    phases: [
      "Phase 1 (complete): SQL + backend admin catalog routes owned in sdkwork-merchandise.",
      "Phase 3 (complete): browse/open app routes owned by `sdkwork-catalog`.",
    ],
    openQuestions: [],
  },
  {
    id: "catalog",
    name: "Catalog (browse/open)",
    status: "active",
    migration: "complete",
    appApi: "/app/v3/api/catalog",
    backendApi: null,
    serviceCrate: null,
    repositoryCrate: "sdkwork-commerce-catalog-repository-sqlx",
    routerCrates: ["sdkwork-routes-catalog-app-api"],
    hasPcApp: false,
    verify: ["cargo test --workspace"],
    problem:
      "Public and integrator-facing catalog browse surfaces should not share the same ownership boundary as merchant admin merchandise mutations.",
    users: "Storefront buyers, integrators, and read-only catalog consumers.",
    goals: [
      "Provide browse/open catalog HTTP routes separate from merchandise admin ownership.",
      "Reuse merchandise read models through explicit adapter boundaries.",
    ],
    nonGoals: [
      "Admin catalog mutations (owned by `sdkwork-merchandise`).",
      "Owning SPU/SKU master write models in this repository long term.",
    ],
    scope: [
      "App browse/open catalog routes: categories, products, SPUs, SKUs, cart, addresses.",
      "Merchandise read stores consumed via `sdkwork-commerce-catalog-repository-sqlx` read adapter (`read_adapter.rs`).",
    ],
    scenarios: [
      "A storefront lists published SPUs without exposing admin mutation endpoints.",
    ],
    metrics: [
      "Browse routes owned here with zero admin write endpoints after split.",
    ],
    phases: [
      "Phase 0 (complete): repository scaffold and api-server health.",
      "Phase 3 (complete): browse/open app routes owned by catalog app router; read adapter in catalog repository crate.",
    ],
    openQuestions: [],
  },
  {
    id: "inventory",
    name: "Inventory",
    status: "active",
    migration: "complete",
    appApi: "/app/v3/api/shops/current/inventory",
    backendApi: "/backend/v3/api/inventory",
    serviceCrate: "sdkwork-commerce-inventory-service",
    repositoryCrate: "sdkwork-commerce-inventory-repository-sqlx",
    routerCrates: [
      "sdkwork-routes-inventory-app-api",
      "sdkwork-routes-inventory-backend-api",
    ],
    hasPcApp: false,
    verify: ["cargo test --workspace"],
    problem:
      "Stock levels, reservations, and inventory adjustments require an isolated capability with clear tenant boundaries and auditable mutations.",
    users: "Warehouse operators, merchant admins, and order fulfillment integrators.",
    goals: [
      "Own inventory domain service, repository SQL, backend admin HTTP, and merchant app inventory routes.",
      "Expose merchant stock list/adjustment at `/app/v3/api/shops/current/inventory/*` from inventory app router.",
    ],
    nonGoals: ["Order payment or catalog master ownership."],
    scope: [
      "Inventory service domain.",
      "Backend inventory SQL + HTTP (stocks, reservations, movements list/update).",
      "Merchant app inventory SQL + HTTP (current shop stock list and adjustments).",
    ],
    scenarios: [
      "Fulfillment reserves stock when an order moves to allocated status.",
      "A merchant operator lists current shop stock and posts quantity adjustments.",
      "An admin operator adjusts on-hand quantity from backend inventory routes.",
    ],
    metrics: [
      "Backend and merchant inventory routes return real data instead of manifest 501 stubs.",
      "Repository crate is the sole inventory SQL owner (shop repo no longer queries inventory tables).",
    ],
    phases: [
      "Phase 1 (complete): domain service moved to sibling repo.",
      "Phase 2 (complete): backend + merchant app SQL/HTTP in sibling repo.",
    ],
    openQuestions: [
      "Whether merchant inventory routes should move from `/shops/current/inventory/*` to `/inventory/*` before production launch.",
    ],
  },
  {
    id: "order",
    name: "Order",
    status: "active",
    migration: "complete",
    appApi: "/app/v3/api/orders",
    backendApi: "/backend/v3/api/orders",
    serviceCrate: "sdkwork-commerce-order-service",
    repositoryCrate: "sdkwork-commerce-order-repository-sqlx",
    routerCrates: ["sdkwork-routes-order-app-api"],
    hasPcApp: false,
    verify: ["cargo test --workspace"],
    problem:
      "Order, checkout, fulfillment, shipment, and after-sales lifecycles must scale independently from payment and catalog capabilities.",
    users: "Buyers, merchant operators, fulfillment staff, and commerce integrators.",
    goals: [
      "Own order lifecycle domain, SQL repositories, and app HTTP routers.",
      "Expose checkout, fulfillment, shipment, and after-sales routes via `build_*_router` exports.",
    ],
    nonGoals: [
      "Payment intent/refund SQL ownership (owned by payment capability).",
      "IAM middleware in capability routers.",
    ],
    scope: [
      "Order create/list/detail/cancel flows.",
      "Checkout session lifecycle.",
      "Fulfillment, shipment tracking, after-sales requests.",
      "Order repository SQL for order lifecycle tables only.",
    ],
    scenarios: [
      "A buyer creates a checkout session, places an order, and tracks fulfillment status.",
      "Commerce T0 wraps order routers with request identity; handlers remain capability-owned.",
    ],
    metrics: [
      "Order integration tests pass in commerce api-server via thin wrappers.",
      "`sdkwork-commerce-order-repository-sqlx` is the sole order SQL owner.",
    ],
    phases: [
      "Phase 1 (complete): SQL + five app routers owned in sdkwork-order.",
      "Phase 2 (complete): payment_intent/refund SQL owned by payment repository; order validates via one-way dependency.",
      "Phase 3 (complete): pay_owner_order and cancel payment side-effects owned by payment repository; order repo is order-table only.",
    ],
    openQuestions: [],
  },
  {
    id: "payment",
    name: "Payment",
    status: "active",
    migration: "complete",
    appApi: "/app/v3/api/payments",
    backendApi: "/backend/v3/api/payments",
    serviceCrate: "sdkwork-commerce-payment-service",
    repositoryCrate: "sdkwork-commerce-payment-repository-sqlx",
    routerCrates: [
      "sdkwork-routes-payment-app-api",
      "sdkwork-routes-payment-backend-api",
    ],
    hasPcApp: false,
    verify: ["cargo test --workspace"],
    problem:
      "Payments, intents, refunds, recharge checkout, and provider admin require strict idempotency, auditability, and provider isolation.",
    users: "Buyers, finance operators, payment integrators, and reconciliation staff.",
    goals: [
      "Own payment/recharge SQL, app payment surfaces, and backend payment admin routes.",
      "Keep write operations protected by command headers and tenant-scoped stores.",
    ],
    nonGoals: [
      "Order header lifecycle (owned by order capability).",
      "Raw provider HTTP without domain service boundaries.",
    ],
    scope: [
      "Payment methods, records, statistics, reconcile flows.",
      "Payment intents, attempts, and owner-order payment orchestration.",
      "Refunds.",
      "Points recharge checkout.",
      "Backend payment admin: methods, providers, channels, route rules, webhooks, reconciliation.",
    ],
    scenarios: [
      "A buyer pays for a pending order; payment record transitions to success with idempotent writes.",
      "An operator configures provider accounts and reviews webhook replay from backend admin routes.",
      "A user purchases points through recharge checkout and polls checkout status.",
    ],
    metrics: [
      "Payment standard tests pass in payment service crate.",
      "Commerce api-server payment tests pass through IAM thin wrappers.",
    ],
    phases: [
      "Phase 1 (complete): payment/recharge SQL + app/backend routers owned in sdkwork-payment.",
      "Phase 2 (complete): payment_intent/refund SQL owned by payment repository.",
      "Phase 3 (complete): SDK contract route `/payments/attempts/{paymentAttemptId}` owned by payment app router.",
      "Phase 4 (complete): owner-order pay/cancel payment side-effects owned by `sqlite_owner_order_payment` / `postgres_owner_order_payment`.",
    ],
    openQuestions: [
      "Provider credential storage encryption policy before production launch.",
    ],
  },
  {
    id: "account",
    name: "Account",
    status: "active",
    migration: "complete",
    appApi: "/app/v3/api/wallet",
    backendApi: null,
    serviceCrate: "sdkwork-commerce-account-service",
    repositoryCrate: "sdkwork-commerce-account-repository-sqlx",
    routerCrates: ["sdkwork-routes-account-app-api"],
    hasPcApp: false,
    verify: ["cargo test --workspace"],
    problem:
      "Wallet balances, ledger entries, account summaries, and billing history must be append-only, version-guarded, and tenant-isolated.",
    users: "Account holders, finance reviewers, and integrators displaying wallet or billing history.",
    goals: [
      "Own account/billing SQL and wallet/billing HTTP routers.",
      "Enforce ledger append-only semantics and optimistic balance versioning.",
    ],
    nonGoals: [
      "Payment provider execution (payment capability).",
      "Promotion point exchange rules (promotion capability).",
    ],
    scope: [
      "Account summary and security read models.",
      "Wallet overview, accounts, ledger entries, token balance reads.",
      "Billing history list.",
    ],
    scenarios: [
      "A user views wallet accounts and ledger history scoped to their tenant identity.",
      "A credit posts through append_ledger_entry with idempotency key replay protection.",
    ],
    metrics: [
      "Repository tests validate version-guarded balance updates.",
      "Commerce wallet routes pass via thin IAM wrappers.",
    ],
    phases: [
      "Phase 1 (complete): SQL + account/billing routers owned in sdkwork-account.",
      "Phase 2 (complete): repository tests use account-local SQLite schema; no commerce storage dev-dep.",
    ],
    openQuestions: [
      "Whether backend wallet admin routes belong in this repo or commerce T0 only.",
    ],
  },
  {
    id: "membership",
    name: "Membership",
    status: "active",
    migration: "complete",
    appApi: "/app/v3/api/membership",
    backendApi: "/backend/v3/api/membership",
    serviceCrate: "sdkwork-commerce-membership-service",
    repositoryCrate: "sdkwork-commerce-membership-repository-sqlx",
    routerCrates: [
      "sdkwork-routes-membership-app-api",
      "sdkwork-routes-membership-backend-api",
    ],
    hasPcApp: false,
    verify: ["cargo test --workspace"],
    problem:
      "Membership tiers, entitlements, and payment-center seed data need a dedicated capability without composing the entire commerce router surface.",
    users: "Subscription operators, entitlement administrators, and buyers managing membership benefits.",
    goals: [
      "Own membership service, repository SQL, and membership-specific routes.",
      "Platform router composition lives in commerce T0 (`sdkwork-commerce-router-composition`).",
    ],
    nonGoals: [
      "Owning non-membership commerce routes in membership repository crate.",
    ],
    scope: [
      "Membership service and repository owned in sdkwork-membership.",
      "Membership app and admin HTTP routes.",
    ],
    scenarios: [
      "An operator configures membership tiers and entitlements for a tenant.",
      "Integration tests seed payment-center data through membership repository helpers.",
    ],
    metrics: [
      "Membership repository tests pass without local duplicate in commerce storage.",
      "Membership repository exports membership-only routers and seed helpers.",
    ],
    phases: [
      "Phase 1 (complete): service + repository in sibling repo.",
      "Phase 2c (complete): platform router composition owned by commerce T0 (`sdkwork-commerce-router-composition`).",
    ],
    openQuestions: [
      "Migrate membership HTTP from repository crate to router crates when routes stabilize.",
    ],
  },
  {
    id: "promotion",
    name: "Promotion",
    status: "active",
    migration: "complete",
    appApi: "/app/v3/api/promotions",
    backendApi: "/backend/v3/api/coupons",
    serviceCrate: "sdkwork-commerce-promotion-service",
    repositoryCrate: "sdkwork-commerce-promotion-repository-sqlx",
    routerCrates: [
      "sdkwork-routes-promotion-app-api",
      "sdkwork-routes-promotion-backend-api",
    ],
    hasPcApp: false,
    verify: ["cargo test --workspace"],
    problem:
      "Coupons, promotional offers, and points exchange rules require isolated validation and redemption logic.",
    users: "Marketing operators, buyers applying coupons, and wallet integrators.",
    goals: [
      "Own promotion/exchange SQL and coupon/points promotion HTTP routers.",
      "Keep promotion domain commands separate from order pricing orchestration at T0.",
    ],
    nonGoals: ["Order persistence ownership."],
    scope: [
      "Promotion coupons, codes, discount applications, points balance/history.",
      "Exchange rule SQL and app HTTP routes (`/wallet/exchange_rate`, `/wallet/points/exchanges/rules`).",
      "App promotion router including wallet points read surfaces owned by promotion store.",
    ],
    scenarios: [
      "A buyer lists available coupons and applies one during checkout orchestrated by order capability.",
      "A wallet integrator reads points-to-cash exchange rate from promotion app router.",
    ],
    metrics: [
      "Promotion SQL and HTTP routes owned exclusively in sdkwork-promotion.",
      "Coupon and exchange routes served from `sdkwork-routes-promotion-app-api`.",
    ],
    phases: [
      "Phase 1 (complete): domain service, SQL, exchange SQL, and app promotion router owned in sdkwork-promotion.",
      "Phase 2 (complete): exchange HTTP routes owned by promotion app router (`exchange_router.rs`).",
    ],
    openQuestions: [],
  },
  {
    id: "invoice",
    name: "Invoice",
    status: "active",
    migration: "complete",
    appApi: "/app/v3/api/invoices",
    backendApi: "/backend/v3/api/invoices",
    serviceCrate: "sdkwork-commerce-invoice-service",
    repositoryCrate: "sdkwork-commerce-invoice-repository-sqlx",
    routerCrates: [
      "sdkwork-routes-invoice-app-api",
      "sdkwork-routes-invoice-backend-api",
    ],
    hasPcApp: false,
    verify: ["cargo test --workspace"],
    problem:
      "Invoice issuance, retrieval, and compliance metadata must be auditable and separated from order/payment write paths.",
    users: "Finance operators, buyers downloading invoices, and compliance reviewers.",
    goals: [
      "Own invoice SQL and app invoice HTTP routers with commerce T0 IAM wrappers.",
    ],
    nonGoals: ["Payment capture execution."],
    scope: [
      "Invoice list/detail/create/update/submit/cancel flows.",
      "Invoice repository SQLx implementations.",
    ],
    scenarios: [
      "A buyer requests an invoice for a completed order.",
      "An operator lists invoice records for a tenant.",
    ],
    metrics: [
      "Invoice SQL and routes owned exclusively in this repository.",
      "Commerce invoice integration tests pass via thin wrappers.",
    ],
    phases: [
      "Phase 1 (complete): SQL + app invoice router owned in sdkwork-invoice.",
      "Phase 2 (complete): mutating invoice routes require Idempotency-Key and Sdkwork-Request-Hash via command header validation.",
    ],
    openQuestions: [
      "Tax identifier and regional compliance fields before production launch.",
    ],
  },
];

function bullets(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function renderPrd(cap) {
  return `# ${cap.name} PRD

Status: ${cap.status}
Owner: ${owner}
Application: ${cap.id}
Updated: ${updated}
Specs: REQUIREMENTS_SPEC.md, DOCUMENTATION_SPEC.md

## Document Map

- Platform split alignment (commerce T0): \`../sdkwork-commerce/docs/architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md\`

## 1. Background And Problem

${cap.problem}

This repository is a **T1 commerce capability building block**. \`sdkwork-commerce\` remains the T0 composition layer (gateway, IAM wrappers, composed SDK). This repository owns domain logic, persistence, and HTTP route builders for the **${cap.id}** capability.

## 2. Target Users

${cap.users}

## 3. Goals And Non-Goals

### Goals

${bullets(cap.goals)}

### Non-Goals

${bullets(cap.nonGoals)}

## 4. Scope

${bullets(cap.scope)}

Primary API prefixes:

- App: \`${cap.appApi}\`${cap.backendApi ? `\n- Backend: \`${cap.backendApi}\`` : ""}

Migration status: **${cap.migration}**.

## 5. User Scenarios

${bullets(cap.scenarios)}

## 6. Success Metrics

${bullets(cap.metrics)}

## 7. Phases

${bullets(cap.phases)}

## 8. Linked Requirements

- Commerce capability split alignment: \`../sdkwork-commerce/docs/architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md\`
- Component contract: \`specs/component.spec.json\` (when present)
- Machine contracts: local \`specs/\`, future \`apis/\`, and generated \`sdks/\`

## 9. Open Questions

${bullets(cap.openQuestions)}
`;
}

function renderTech(cap) {
  const crates = [
    cap.serviceCrate && `sdkwork-commerce-${cap.id}-service`,
    cap.repositoryCrate,
    ...cap.routerCrates,
    `sdkwork-${cap.id}-database-host`,
    `sdkwork-${cap.id}-service-host`,
    `sdkwork-${cap.id}-api-server`,
  ].filter(Boolean);

  return `# ${cap.name} Technical Architecture

Status: ${cap.status}
Owner: ${owner}
Updated: ${updated}
Specs: ARCHITECTURE_DECISION_SPEC.md, RUST_CODE_SPEC.md, API_SPEC.md, WEB_FRAMEWORK_SPEC.md, DATABASE_FRAMEWORK_SPEC.md

## Document Map

- [TECH split alignment (commerce T0)](../sdkwork-commerce/docs/architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md)

## 1. Architecture Overview

\`sdkwork-${cap.id}\` is a **T1 capability repository** in the commerce domain. It exposes domain services, SQL repositories, and HTTP route builders. \`sdkwork-commerce\` composes these crates at runtime:

\`\`\`text
T1 ${cap.id} crate  →  build_*_router()     (no IAM)
T0 commerce         →  with_request_identity / with_backend_request_identity
\`\`\`

Migration status: **${cap.migration}**.

## 2. Technology Choices

- **Rust** domain services and SQLx repositories (\`RUST_CODE_SPEC.md\`)
- **Axum** HTTP routers integrated via \`sdkwork-web-framework\` (\`WEB_FRAMEWORK_SPEC.md\`)
- **sqlx** for Postgres/SQLite repository implementations (\`DATABASE_FRAMEWORK_SPEC.md\`)
- **Sibling path dependencies** from \`sdkwork-commerce/Cargo.toml\` — no duplicated domain crates in commerce

## 3. System Boundaries And Modules

| Layer | Owner | Notes |
| --- | --- | --- |
| Domain commands/queries | \`${cap.serviceCrate ?? "scaffold"}\` | Business validation and ports |
| SQL repositories | \`${cap.repositoryCrate ?? "pending"}\` | Tenant-scoped persistence |
| HTTP route builders | ${cap.routerCrates.join(", ")} | \`build_*_router\` exports without IAM |
| IAM / gateway composition | \`sdkwork-commerce\` | Thin wrappers only |
| OpenAPI / SDK authority | \`sdkwork-commerce/sdks/\` | Composed commerce SDK families |

## 4. Directory And Package Layout

Standard 7-crate capability workspace:

${bullets(crates.map((c) => `\`crates/${c}/\``))}

${cap.hasPcApp ? `Optional PC application root: \`apps/sdkwork-${cap.id}-pc/\`.` : "No PC application root in this repository yet."}

## 5. API, SDK, And Data Ownership

- App API prefix: \`${cap.appApi}\`
${cap.backendApi ? `- Backend API prefix: \`${cap.backendApi}\`` : "- Backend API: composed through commerce T0 where applicable."}
- Table prefix: \`commerce_\` for capability-owned tables (\`DOMAIN_SPEC\` domain=commerce)
- Public SDK consumption: generated **commerce** SDK families at T0; do not hand-craft raw HTTP (\`SDK_SPEC.md\`)

## 6. Security, Privacy, And Observability

- Authentication and tenant context are applied at **commerce T0** IAM middleware; handlers read \`IamAppContext\` from extensions.
- Write routes require idempotency and request-hash headers where applicable (\`API_SPEC.md\`, \`SECURITY_SPEC.md\`).
- Ledger, payment, and account mutations must fail closed on validation errors.
- Structured errors use \`CommerceServiceError\` contracts; do not leak internal SQL details to clients.

## 7. Deployment And Runtime Topology

- Local development: \`cargo test --workspace\` in this repository.
- Platform composition: \`sdkwork-commerce\` service host merges capability routers into the commerce HTTP surface.
- Independent deployment of this capability server is supported via \`sdkwork-${cap.id}-api-server\` for building-block topology; production gateway routing is owned by commerce/app topology specs.

## 8. Architecture Decision Index

- [TECH-2026-06-24-commerce-capability-repo-split-alignment.md](../sdkwork-commerce/docs/architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md)

## 9. Verification

\`\`\`bash
${cap.verify.join("\n")}
\`\`\`

From commerce T0 after boundary changes:

\`\`\`bash
cd ../sdkwork-commerce
cargo test --workspace
node --test sdks/test/verify-commerce-migration-cleanup.test.mjs
\`\`\`
`;
}

function renderReadme(cap) {
  const lines = [
    `# sdkwork-${cap.id}`,
    "",
    `SDKWork commerce **${cap.id}** capability building-block repository (domain \`commerce\`).`,
    "",
    `- Standards: \`../sdkwork-specs/README.md\``,
    `- Composition consumer: \`../sdkwork-commerce\` (T0 platform)`,
    `- Domain service: \`crates/${cap.serviceCrate ?? `sdkwork-commerce-${cap.id}-service`}/\``,
  ];
  if (cap.repositoryCrate) {
    lines.push(`- Repository SQL: \`crates/${cap.repositoryCrate}/\``);
  }
  if (cap.hasPcApp) {
    lines.push(`- PC app: \`apps/sdkwork-${cap.id}-pc/\``);
  }
  lines.push(
    `- HTTP API server: \`crates/sdkwork-${cap.id}-api-server/\``,
    "",
    "## Quick start",
    "",
    "```bash",
    ...cap.verify,
    "```",
    "",
    "## Documentation Canon",
    "",
    "- [docs/README.md](docs/README.md)",
    "- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)",
    "- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)",
    "",
  );
  return lines.join("\n");
}

const DOC_CANON_BLOCK = `
## Documentation Canon

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)
`.trim();

async function patchAgents(repoRoot) {
  const agentsPath = path.join(repoRoot, "AGENTS.md");
  try {
    await access(agentsPath);
  } catch {
    return;
  }
  let text = await readFile(agentsPath, "utf8");
  if (text.includes("docs/product/prd/PRD.md")) {
    return;
  }
  text = `${text.trimEnd()}\n\n${DOC_CANON_BLOCK}\n`;
  await writeFile(agentsPath, text);
}

async function syncCapability(cap) {
  const repoRoot = path.join(workspaceRoot, `sdkwork-${cap.id}`);
  try {
    await access(repoRoot);
  } catch {
    console.warn(`skip missing repo: ${repoRoot}`);
    return;
  }
  const docsRoot = path.join(repoRoot, "docs");
  await writeFile(path.join(docsRoot, "product", "prd", "PRD.md"), renderPrd(cap));
  await writeFile(
    path.join(docsRoot, "architecture", "tech", "TECH_ARCHITECTURE.md"),
    renderTech(cap),
  );
  await writeFile(path.join(repoRoot, "README.md"), renderReadme(cap));
  await patchAgents(repoRoot);
  console.log(`synced docs: sdkwork-${cap.id}`);
}

function renderCommercePrd() {
  return `# Commerce PRD

Status: draft
Owner: ${owner}
Application: commerce
Updated: ${updated}
Specs: REQUIREMENTS_SPEC.md, DOCUMENTATION_SPEC.md

## Document Map

- [TECH-2026-06-24-commerce-capability-repo-split-alignment.md](architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md)
- PC application PRD: \`apps/sdkwork-commerce-pc/docs/product/prd/PRD.md\`

## 1. Background And Problem

Commerce requires a **platform composition layer** that exposes unified HTTP APIs, composed SDK families, and operator PC applications while delegating domain ownership to independent T1 capability repositories (\`sdkwork-shop\`, \`sdkwork-order\`, \`sdkwork-payment\`, etc.).

Without this split, a monolithic crate becomes hard to deploy, test, and evolve per capability before production launch.

## 2. Target Users

- **Merchant operators** using the commerce PC admin application.
- **Buyers and integrators** consuming app APIs through generated SDKs.
- **Platform engineers** composing gateway routes, IAM, storage bootstrap, and cross-capability verification.
- **Capability teams** owning sibling repositories consumed via path dependencies.

## 3. Goals And Non-Goals

### Goals

- Provide T0 gateway/composition: IAM wrappers, router merge, composed OpenAPI/SDK, storage bootstrap.
- Consume T1 capabilities exclusively through sibling \`Cargo.toml [workspace.dependencies]\` paths.
- Ship \`apps/sdkwork-commerce-pc\` operator console wired to generated commerce SDKs.
- Enforce architecture tests that forbid reintroducing local capability domain crates.

### Non-Goals

- Owning shop/order/payment/account domain logic in local \`crates/sdkwork-commerce-*-service\` duplicates.
- Copying appbase IAM/login/session ownership into commerce.
- Production launch before capability migrations and documentation Canon are complete (pre-release workspace).

## 4. Scope

- \`apis/\`, \`sdks/\`: OpenAPI authorities and generated SDK families (app, backend, composed).
- \`crates/sdkwork-commerce-api-server\`: thin IAM HTTP wrappers over T1 \`build_*_router\` exports.
- \`crates/sdkwork-commerce-storage-repository-sqlx\`: T0 storage bootstrap; re-exports T1 repository crates.
- \`crates/sdkwork-commerce-service-host\`, RPC hosts, contract services.
- \`apps/sdkwork-commerce-pc\`: PC React application packages.
- Sibling consumption of ten T1 capability repositories under \`../sdkwork-*\`.

## 5. User Scenarios

- An operator signs in through appbase IAM, opens commerce PC, and manages shops, catalog, orders, and payments via composed SDK calls.
- A buyer app creates checkout and payment intents through app APIs; commerce T0 attaches identity context before T1 handlers run.
- A platform engineer runs \`cargo test --workspace\` and architecture Node tests to verify no forbidden local capability crates remain.

## 6. Success Metrics

- All T1 capabilities document Canon PRD + TECH + README per \`DOCUMENTATION_SPEC.md\`.
- \`verify-commerce-migration-cleanup.test.mjs\` passes.
- \`pnpm run verify\` passes for commerce (check, RPC, Node, Vitest, rustfmt, clippy, cargo test).
- \`cargo test --workspace\` passes for commerce and all T1 capability repos under verification.
- OpenAPI/SDK smoke tests retain product, order, and payment operations on composed surfaces.

## 7. Phases

- **T1 split (complete)**: ten capability repositories own domain, SQL, and HTTP; commerce T0 owns composition only.
- **Platform hardening (complete)**: inventory SQL/HTTP; payment/order SQL decoupling; catalog browse/open split; invoice write header validation.
- **Pre-production gate (met)**: Canon docs synced, zero forbidden duplicates, \`pnpm run verify\` green.

## 8. Linked Requirements

- [TECH-2026-06-24-commerce-capability-repo-split-alignment.md](architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md)
- \`specs/component.spec.json\`
- \`../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md\`, \`SDK_SPEC.md\`, \`API_SPEC.md\`

## 9. Open Questions

- Timeline for extracting \`sdkwork-commerce-pc\` to an independent \`sdkwork-commerce-pc\` repository.
- Final production gateway topology vs local private Rust deployment profiles.
`;
}

function renderCommerceTech() {
  return `# Commerce Technical Architecture

Status: active
Owner: ${owner}
Updated: ${updated}
Specs: ARCHITECTURE_DECISION_SPEC.md, API_SPEC.md, SDK_SPEC.md, WEB_FRAMEWORK_SPEC.md, IAM_SPEC.md

## Document Map

| Document | Status |
| --- | --- |
| [TECH-2026-06-24-commerce-capability-repo-split-alignment.md](TECH-2026-06-24-commerce-capability-repo-split-alignment.md) | **Active** — T1/T0 split tracker |
| [TECH-2026-06-18-commerce-standards-alignment.md](TECH-2026-06-18-commerce-standards-alignment.md) | Active — standards alignment |
| [TECH-2026-06-07-commerce-product-center-migration.md](TECH-2026-06-07-commerce-product-center-migration.md) | Historical — pre-split migration |
| [TECH-2026-06-07-commerce-product-center-migration-design.md](TECH-2026-06-07-commerce-product-center-migration-design.md) | Historical — design notes |
| [TECH-2026-06-10-commerce-order-payment-hardening.md](TECH-2026-06-10-commerce-order-payment-hardening.md) | Historical — hardening record |
| [TECH-2026-06-10-commerce-order-payment-hardening-design.md](TECH-2026-06-10-commerce-order-payment-hardening-design.md) | Historical — design notes |
| [TECH-2026-06-10-commerce-standard-product-foundation-design.md](TECH-2026-06-10-commerce-standard-product-foundation-design.md) | Historical — foundation design |
| [TECH-2026-06-10-commerce-transaction-schema-hardening-design.md](TECH-2026-06-10-commerce-transaction-schema-hardening-design.md) | Historical — schema hardening |

Pre-capability-split shards are retained for audit traceability. **Current architecture truth** for repository boundaries is \`TECH-2026-06-24-commerce-capability-repo-split-alignment.md\`.

## 1. Architecture Overview

\`sdkwork-commerce\` is the **T0 platform composition layer** for the commerce domain. Ten **T1 capability repositories** own domain services, SQL, and HTTP route builders. Commerce merges routers, applies IAM middleware, bootstraps storage, and publishes composed SDK/OpenAPI surfaces.

\`\`\`text
T1 capability  →  build_*_router()              (no IAM)
T0 commerce    →  with_request_identity(...)    (app)
                 with_backend_request_identity(...) (backend)
\`\`\`

## 2. Technology Choices

- **Rust** service host and api-server (\`RUST_CODE_SPEC.md\`, \`RUST_RPC_SPEC.md\`)
- **TypeScript / React** PC app under \`apps/sdkwork-commerce-pc\` (\`APP_PC_ARCHITECTURE_SPEC.md\`)
- **pnpm** workspace for SDK generation and Node verification (\`PNPM_SCRIPT_SPEC.md\`)
- **sqlx** storage bootstrap with T1 repository re-exports (\`DATABASE_FRAMEWORK_SPEC.md\`)
- **Generated SDKs** via \`@sdkwork/sdk-generator\` (\`SDK_WORKSPACE_GENERATION_SPEC.md\`)

## 3. System Boundaries And Modules

| Module | Role |
| --- | --- |
| T1 \`../sdkwork-*\` repos | Domain + SQL + route builders |
| \`sdkwork-commerce-api-server\` | IAM thin wrappers, router merge |
| \`sdkwork-commerce-storage-repository-sqlx\` | DB bootstrap + T1 re-exports |
| \`sdkwork-commerce-service-host\` | HTTP/RPC host wiring |
| \`sdks/sdkwork-commerce-*-sdk\` | Generated client families |
| \`apps/sdkwork-commerce-pc\` | Operator PC UI |

Forbidden: local \`crates/sdkwork-commerce-{shop,order,payment,...}-service\` duplicates.

## 4. Directory And Package Layout

See \`AGENTS.md\` local dictionary and \`SDKWORK_WORKSPACE_SPEC.md\`. Key roots: \`apis/\`, \`sdks/\`, \`crates/\`, \`apps/\`, \`database/\`, \`configs/\`, \`docs/\`, \`specs/\`, \`tools/\`.

Bootstrap: \`tools/bootstrap_commerce_capability_repos.mjs\`, \`tools/sync_commerce_capability_docs.mjs\`.

## 5. API, SDK, And Data Ownership

- OpenAPI authorities live under \`sdks/\`; commerce owns **composition**, not T1 table implementations.
- App APIs: \`/app/v3/api/*\`; backend: \`/backend/v3/api/*\`.
- IAM/session: appbase; commerce applies request identity adapters only.

## 6. Security, Privacy, And Observability

- All app/backend routes pass through IAM middleware at T0 unless explicitly public per route manifest.
- Write operations require idempotency and request-hash headers on mutating T1 endpoints.
- No secrets in repository docs or configs committed to git (\`SECURITY_SPEC.md\`, \`PRIVACY_SPEC.md\`).

## 7. Deployment And Runtime Topology

- Development: local Rust HTTP host + PC Vite app; see \`configs/\` and \`apps/sdkwork-commerce-pc/config/\`.
- Capability repos may run standalone api-servers; production composition targets commerce gateway topology (\`APP_RUNTIME_TOPOLOGY_SPEC.md\`).
- Pre-production: application not yet launched; docs describe target state without legacy monolith paths.

## 8. Architecture Decision Index

- [TECH-2026-06-24-commerce-capability-repo-split-alignment.md](TECH-2026-06-24-commerce-capability-repo-split-alignment.md)

## 9. Verification

\`\`\`bash
cargo test --workspace
cargo fmt --all --check
node --test sdks/test/verify-commerce-migration-cleanup.test.mjs
node --test sdks/test/verify-commerce-standard-architecture.test.mjs
pnpm run sdk:check
pnpm run typecheck
\`\`\`
`;
}

function renderCommerceReadme() {
  return `# sdkwork-commerce

SDKWork **commerce platform composition layer** (T0): gateway HTTP surface, IAM wrappers, composed SDK families, storage bootstrap, and the commerce PC operator application.

T1 capabilities (shop, order, payment, account, …) live in sibling \`../sdkwork-*\` repositories and are consumed via path dependencies — not duplicated under \`crates/\`.

## Architecture

- **T0 (this repo)**: router composition, IAM middleware, OpenAPI/SDK authorities, cross-capability bootstrap.
- **T1 (sibling repos)**: domain services, SQL repositories, \`build_*_router\` HTTP handlers.
- Authoritative API contracts: \`apis/\`, generated SDKs: \`sdks/sdkwork-commerce-{sdk,app-sdk,backend-sdk}\`.
- PC application: \`apps/sdkwork-commerce-pc/\`.
- Rust host crates: \`crates/sdkwork-commerce-api-server\`, \`service-host\`, \`storage-repository-sqlx\`, etc.

Alignment tracker: [docs/architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md](docs/architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md)

## Standards

Start from \`../sdkwork-specs/\`:

- [SOUL.md](../sdkwork-specs/SOUL.md)
- [SDKWORK_WORKSPACE_SPEC.md](../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md)
- [API_SPEC.md](../sdkwork-specs/API_SPEC.md)
- [SDK_SPEC.md](../sdkwork-specs/SDK_SPEC.md)
- [DOCUMENTATION_SPEC.md](../sdkwork-specs/DOCUMENTATION_SPEC.md)

Do not copy canonical standard text into this repository.

## SDK And OpenAPI

\`\`\`bash
pnpm run sdk:check
pnpm run sdk:generate
\`\`\`

## Verification

\`\`\`bash
cargo test --workspace
cargo fmt --all --check
node --test sdks/test/verify-commerce-migration-cleanup.test.mjs
pnpm run typecheck
\`\`\`

Sync capability Canon docs across sibling repos:

\`\`\`bash
node tools/sync_commerce_capability_docs.mjs
\`\`\`

## Documentation Canon

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)
`;
}

async function syncCommercePlatform() {
  await writeFile(
    path.join(commerceRoot, "docs", "product", "prd", "PRD.md"),
    renderCommercePrd(),
  );
  await writeFile(
    path.join(commerceRoot, "docs", "architecture", "tech", "TECH_ARCHITECTURE.md"),
    renderCommerceTech(),
  );
  await writeFile(path.join(commerceRoot, "README.md"), renderCommerceReadme());
  const docsReadme = `# Commerce Documentation

## Audience Routing

| I am… | Read first | Then read |
| --- | --- | --- |
| Product or business | [product/prd/PRD.md](product/prd/PRD.md) | [product/requirements/](product/requirements/) |
| Architect | [architecture/tech/TECH_ARCHITECTURE.md](architecture/tech/TECH_ARCHITECTURE.md) | [architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md](architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md) |
| Developer | [guides/developer/README.md](guides/developer/README.md) | [engineering/plans/](engineering/plans/) |
| Operator | [guides/operator/README.md](guides/operator/README.md) | [runbooks/](runbooks/) |
| Integrator | [guides/integrator/README.md](guides/integrator/README.md) | repository \`apis/\` and \`sdks/\` |
| Agent | [../AGENTS.md](../AGENTS.md) | [INDEX.yaml](INDEX.yaml) |

## Canon Documents

| Document | Path |
| --- | --- |
| Product PRD | [product/prd/PRD.md](product/prd/PRD.md) |
| Technical architecture | [architecture/tech/TECH_ARCHITECTURE.md](architecture/tech/TECH_ARCHITECTURE.md) |
| Capability split alignment | [architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md](architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md) |

## Related Specs

- \`../sdkwork-specs/DOCUMENTATION_SPEC.md\`
- \`../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md\`
- \`../sdkwork-specs/REQUIREMENTS_SPEC.md\`

## Verification

\`\`\`bash
node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .
node tools/sync_commerce_capability_docs.mjs
\`\`\`
`;
  await writeFile(path.join(commerceRoot, "docs", "README.md"), docsReadme);
  console.log("synced docs: sdkwork-commerce (T0 platform)");
}

const selected = process.argv.slice(2);
const caps =
  selected.length > 0
    ? CAPABILITIES.filter((c) => selected.includes(c.id))
    : CAPABILITIES;

for (const cap of caps) {
  await syncCapability(cap);
}
await syncCommercePlatform();
