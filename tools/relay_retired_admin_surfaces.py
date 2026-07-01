"""Shared retired Claw Router admin portal surfaces (relay-only alignment)."""

from __future__ import annotations

# Portal route prefixes removed from apps/sdkwork-clawrouter-pc App.tsx admin shell.
RELAY_RETIRED_ADMIN_PORTAL_ROUTE_PREFIXES: tuple[str, ...] = (
    "/admin/catalog",
    "/admin/orders",
    "/admin/payments",
    "/admin/memberships",
    "/admin/marketing",
    "/admin/finance",
    "/admin/wallet",
    "/admin/oauth",
    "/admin/service-providers",
    "/admin/agents",
    "/admin/skill",
    "/admin/prompts",
    "/admin/mcp",
    "/admin/announcement",
    "/admin/user",
    "/admin/organization",
    "/admin/inventory",
    "/admin/storage",
    "/admin/drive",
    "/admin/messaging",
)

# Inferred UI routes in frontend-field-contracts.yaml (API path → /admin/{segment}/...).
RELAY_RETIRED_ADMIN_OPERATION_ROUTE_PREFIXES: tuple[str, ...] = (
    "/admin/after_sales",
    "/admin/catalog",
    "/admin/commerce_reports",
    "/admin/content",
    "/admin/entitlements",
    "/admin/fulfillments",
    "/admin/iam",
    "/admin/inventory",
    "/admin/invoices",
    "/admin/mcp",
    "/admin/memberships",
    "/admin/messaging",
    "/admin/orders",
    "/admin/payments",
    "/admin/promotions",
    "/admin/recharges",
    "/admin/refunds",
    "/admin/reports",
    "/admin/service_providers",
    "/admin/shipments",
    "/admin/shops",
    "/admin/storage",
    "/admin/wallet",
)


def is_relay_retired_admin_portal_route(route: str) -> bool:
    return any(
        route == prefix or route.startswith(f"{prefix}/")
        for prefix in RELAY_RETIRED_ADMIN_PORTAL_ROUTE_PREFIXES
    )


def is_relay_retired_admin_operation_route(route: str) -> bool:
    return any(
        route == prefix or route.startswith(f"{prefix}/")
        for prefix in RELAY_RETIRED_ADMIN_OPERATION_ROUTE_PREFIXES
    )


# PC admin package path segments removed from relay portal (commerce/platform/file-platform).
RELAY_RETIRED_ADMIN_PACKAGE_SEGMENTS: tuple[str, ...] = (
    "sdkwork-clawrouter-pc-admin-catalog",
    "sdkwork-clawrouter-pc-admin-orders",
    "sdkwork-clawrouter-pc-admin-payments",
    "sdkwork-clawrouter-pc-admin-wallet",
    "sdkwork-clawrouter-pc-admin-finance",
    "sdkwork-clawrouter-pc-admin-marketing",
    "sdkwork-clawrouter-pc-admin-memberships",
    "sdkwork-clawrouter-pc-admin-inventory",
    "sdkwork-clawrouter-pc-admin-messaging",
    "sdkwork-clawrouter-pc-admin-agents",
    "sdkwork-clawrouter-pc-admin-skill",
    "sdkwork-clawrouter-pc-admin-prompts",
    "sdkwork-clawrouter-pc-admin-mcp",
    "sdkwork-clawrouter-pc-admin-announcement",
    "sdkwork-clawrouter-pc-admin-user",
    "sdkwork-clawrouter-pc-admin-organization",
    "sdkwork-clawrouter-pc-admin-oauth",
    "sdkwork-clawrouter-pc-admin-service-provider",
    "sdkwork-clawrouter-pc-admin-file-platform",
)

ROUTE_MANIFEST_BOOTSTRAP_SOURCE = "tools/bootstrap_frontend_contract_from_route_manifest.py"


def is_relay_retired_admin_source(source: str) -> bool:
    normalized = source.replace("\\", "/")
    return any(segment in normalized for segment in RELAY_RETIRED_ADMIN_PACKAGE_SEGMENTS)


def is_route_manifest_bootstrap_source(source: str) -> bool:
    return source.replace("\\", "/") == ROUTE_MANIFEST_BOOTSTRAP_SOURCE
