import json
import re

ROOT = "/mnt/e/sdkwork-space/sdkwork-cloudrouter"

def normalize(path):
    return re.sub(r"\{[^}]+\}", "{param}", path)

def surface_label(path):
    if path.startswith("/app/v3/api"):
        return "app-api"
    if path.startswith("/backend/v3/api"):
        return "backend-api"
    if path.startswith("/internal/v3/api"):
        return "internal-api"
    if path.startswith("/v1"):
        return "gateway-api"
    if path.startswith("/"):
        return "open-api"
    return "unknown"

def auth_label(auth_kind):
    return {
        "dual_token": "dual-token",
        "api_key": "api-key",
        "public": "anonymous",
        "credential_entry_bootstrap": "credential-entry-bootstrap",
        "refresh_token": "refresh-token",
        "agent_token": "agent-token",
        "oauth": "oauth",
        "open_api_flexible": "open-api-flexible",
        "open_api_bearer_flexible": "open-api-bearer-flexible",
        "api_key_or_dual_token": "api-key-or-dual-token",
        "ingress_token": "ingress-token",
    }.get(auth_kind, auth_kind)

def load_manifest_routes(filepath):
    src = open(filepath, encoding="utf-8").read()
    routes = []
    for m in re.finditer(
        r"HttpRoute::(\w+)\(\s*HttpMethod::(\w+),\s*\"([^\"]+)\",\s*\"([^\"]+)\",\s*\"([^\"]+)\"",
        src,
    ):
        auth, method, path, tag, opid = m.groups()
        routes.append((surface_label(path), method.upper(), normalize(path), opid, auth_label(auth)))
    return routes

manifest_routes = []
manifest_routes += load_manifest_routes(f"{ROOT}/crates/sdkwork-routes-cloudrouter-app-api/src/http_route_manifest.rs")
manifest_routes += load_manifest_routes(f"{ROOT}/crates/sdkwork-routes-cloudrouter-backend-api/src/http_route_manifest.rs")
manifest_routes += load_manifest_routes(f"{ROOT}/crates/sdkwork-api-cloudrouter-assembly/src/generated_open_http_route_manifest.rs")
print(f"manifest routes: {len(manifest_routes)}")

openapi_routes = []
for rel in [
    "apis/app-api/cloudrouter/cloudrouter-app-api.openapi.json",
    "apis/backend-api/cloudrouter/cloudrouter-backend-api.openapi.json",
    "apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json",
]:
    doc = json.load(open(f"{ROOT}/{rel}", encoding="utf-8"))
    for path, methods in doc.get("paths", {}).items():
        for method, op in methods.items():
            if method.upper() not in ("GET", "POST", "PUT", "PATCH", "DELETE"):
                continue
            openapi_routes.append((
                op.get("x-sdkwork-api-surface", "MISSING"),
                method.upper(),
                normalize(path),
                op.get("operationId"),
                op.get("x-sdkwork-auth-mode", "MISSING"),
            ))
print(f"openapi routes: {len(openapi_routes)}")

man = {(s, m, p, o): a for s, m, p, o, a in manifest_routes}
opn = {(s, m, p, o): a for s, m, p, o, a in openapi_routes}

print("--- only in manifest ---")
for key in sorted(set(man) - set(opn)):
    print(" ", key, "auth:", man[key])
print("--- only in openapi ---")
for key in sorted(set(opn) - set(man)):
    print(" ", key, "auth:", opn[key])
print("--- auth mismatch ---")
for key in sorted(set(man) & set(opn)):
    if man[key] != opn[key]:
        print(" ", key, "manifest:", man[key], "openapi:", opn[key])
if set(man) == set(opn) and all(man[k] == opn[k] for k in man):
    print("INVENTORIES MATCH")
