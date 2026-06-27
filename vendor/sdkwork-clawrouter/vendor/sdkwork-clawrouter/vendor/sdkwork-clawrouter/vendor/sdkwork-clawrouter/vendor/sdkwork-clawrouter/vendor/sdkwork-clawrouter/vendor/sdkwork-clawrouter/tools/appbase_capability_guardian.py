from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised only when PyYAML is unavailable
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None


APPBASE_ROOT = Path(".sdkwork") / "dependencies" / "sdkwork-appbase"
DEFAULT_MANIFEST = Path(APPBASE_ROOT) / "specs" / "appbase-capabilities.yaml"

L3_REQUIRED_LAYER_KINDS: tuple[str, ...] = (
    "contracts",
    "sdk_ports",
    "service",
    "runtime",
    "native_rust_core",
    "native_rust_storage_sqlx",
    "pc_react",
)

L3_REQUIRED_QUALITY_GATE_CATEGORIES: tuple[str, ...] = (
    "contract",
    "runtime",
    "storage",
    "frontend",
)

MATURITY_RANK: dict[str, int] = {
    "L0": 0,
    "L1": 1,
    "L2": 2,
    "L3": 3,
}

FORBIDDEN_APPBASE_PATH_NAMES: tuple[str, ...] = (
    "-".join(["appbase", "sdk", "clients"]),
)

FORBIDDEN_REUSABLE_IMPORTS: tuple[str, ...] = (
    "@sdkwork/clawrouter-app-sdk",
    "@sdkwork/clawrouter-backend-sdk",
    "@sdkwork/clawrouter-open-sdk",
)

SCANNED_SOURCE_SUFFIXES: tuple[str, ...] = (
    ".ts",
    ".tsx",
    ".mts",
    ".cts",
    ".js",
    ".jsx",
    ".rs",
)

IGNORED_DIR_NAMES: set[str] = {
    ".git",
    ".pnpm",
    "dist",
    "node_modules",
    "target",
}

COMMERCE_UNIFIED_PRODUCT_CENTER_SCOPES: tuple[str, ...] = (
    "product-center",
    "catalog",
    "spu",
    "sku",
    "category",
    "attribute",
    "price-list",
    "inventory",
)

COMMERCE_COMPLETE_CLOSURE_SCOPES: tuple[str, ...] = (
    "cart",
    "addresses",
    "checkout",
    "orders",
    "payments",
    "payment-providers",
    "payment-provider-accounts",
    "payment-methods",
    "payment-channels",
    "payment-route-rules",
    "payment-webhooks",
    "payment-reconciliation",
    "refunds",
    "fulfillments",
    "shipments",
    "memberships",
    "points",
    "recharges",
    "wallet",
    "coupons",
    "invoices",
    "settlements",
    "audit",
    "reports",
)


@dataclass(frozen=True)
class AppbaseCapabilityGuardianResult:
    ok: bool
    messages: list[str]


class AppbaseCapabilityGuardian:
    """Validate that sdkwork-appbase capabilities are declared as reusable building blocks."""

    def __init__(self, root: Path, manifest_path: Path | None = None) -> None:
        self.root = Path(root).resolve()
        self.manifest_path = (
            Path(manifest_path).resolve()
            if manifest_path is not None
            else self._default_manifest_path()
        )
        self.appbase_root = self._resolve_appbase_root()
        self._pnpm_packages: dict[str, set[str]] | None = None
        self._cargo_packages: set[str] | None = None

    def _default_manifest_path(self) -> Path:
        materialized_manifest = self.root / DEFAULT_MANIFEST
        if materialized_manifest.exists():
            return materialized_manifest
        sibling_manifest = self.root.parent / "sdkwork-appbase" / "specs" / "appbase-capabilities.yaml"
        if sibling_manifest.exists():
            return sibling_manifest
        return materialized_manifest

    def _resolve_appbase_root(self) -> Path:
        if self.manifest_path.name == "appbase-capabilities.yaml" and self.manifest_path.parent.name == "specs":
            return self.manifest_path.parent.parent
        materialized_root = self.root / APPBASE_ROOT
        if materialized_root.exists():
            return materialized_root
        sibling_root = self.root.parent / "sdkwork-appbase"
        if sibling_root.exists():
            return sibling_root
        return materialized_root

    def run(self) -> AppbaseCapabilityGuardianResult:
        messages: list[str] = []
        manifest = self._load_manifest(messages)
        if manifest is not None:
            messages.extend(self._validate_manifest(manifest))
        messages.extend(self._validate_forbidden_paths())
        messages.extend(self._validate_reusable_source_boundaries())
        return AppbaseCapabilityGuardianResult(ok=not messages, messages=messages)

    def _load_manifest(self, messages: list[str]) -> dict[str, Any] | None:
        if yaml is None:
            messages.append(f"PyYAML is required to validate appbase capability manifest: {_YAML_IMPORT_ERROR}")
            return None
        if not self.manifest_path.exists():
            messages.append(f"missing appbase capability manifest: {self._display_path(self.manifest_path)}")
            return None
        payload = yaml.safe_load(self.manifest_path.read_text(encoding="utf-8")) or {}
        if not isinstance(payload, dict):
            messages.append("appbase capability manifest root must be a mapping")
            return None
        return payload

    def _validate_manifest(self, manifest: dict[str, Any]) -> list[str]:
        messages: list[str] = []
        if manifest.get("kind") != "sdkwork.appbase.capability.catalog":
            messages.append("appbase capability manifest kind must be sdkwork.appbase.capability.catalog")
        capabilities = manifest.get("capabilities")
        if not isinstance(capabilities, list) or not capabilities:
            messages.append("appbase capability manifest must declare at least one capability")
            return messages
        seen_ids: set[str] = set()
        for index, capability in enumerate(capabilities):
            if not isinstance(capability, dict):
                messages.append(f"capability entry at index {index} must be a mapping")
                continue
            messages.extend(self._validate_capability(capability, seen_ids, index))
        return messages

    def _validate_capability(self, capability: dict[str, Any], seen_ids: set[str], index: int) -> list[str]:
        messages: list[str] = []
        capability_id = self._required_string(capability, "id", f"capability entry at index {index}", messages)
        if capability_id:
            if capability_id in seen_ids:
                messages.append(f"duplicate appbase capability id: {capability_id}")
            seen_ids.add(capability_id)
        domain = self._required_string(capability, "domain", f"capability {capability_id or index}", messages)
        status = self._required_string(capability, "status", f"capability {capability_id or index}", messages)
        maturity = self._required_string(capability, "maturity", f"capability {capability_id or index}", messages)
        target_maturity = self._required_string(capability, "targetMaturity", f"capability {capability_id or index}", messages)
        self._required_string(capability, "priority", f"capability {capability_id or index}", messages)
        self._required_string(capability, "owner", f"capability {capability_id or index}", messages)
        if maturity and maturity not in MATURITY_RANK:
            messages.append(f"capability {capability_id or index} maturity must be one of L0, L1, L2, L3")
        if target_maturity and target_maturity not in MATURITY_RANK:
            messages.append(f"capability {capability_id or index} targetMaturity must be one of L0, L1, L2, L3")
        if maturity and target_maturity and maturity in MATURITY_RANK and target_maturity in MATURITY_RANK:
            if MATURITY_RANK[target_maturity] < MATURITY_RANK[maturity]:
                messages.append(
                    f"capability {capability_id or index} targetMaturity {target_maturity} cannot be lower than maturity {maturity}"
                )
        if status == "standard" and maturity != "L3":
            messages.append(f"capability {capability_id or index} status standard requires maturity L3")
        is_externalized = status == "externalized"

        if is_externalized:
            layer_kinds = self._validate_externalized_capability(capability, capability_id or str(index), messages)
        else:
            layers = capability.get("requiredLayers")
            if not isinstance(layers, list) or not layers:
                messages.append(f"capability {capability_id or index} must declare requiredLayers")
                layers = []
            layer_kinds = self._validate_layers(capability_id or str(index), domain, layers, messages)

        quality_gates = capability.get("qualityGates")
        if not isinstance(quality_gates, list) or not quality_gates:
            messages.append(f"capability {capability_id or index} must declare qualityGates")
            quality_gates = []
        quality_gate_categories = self._validate_quality_gates(capability_id or str(index), quality_gates, messages)

        integration = capability.get("integration")
        if not isinstance(integration, dict):
            messages.append(f"capability {capability_id or index} must declare integration policy")
        else:
            if not self._forks_forbidden(integration):
                messages.append(
                    f"capability {capability_id or index} must set integration.productForksForbidden "
                    "or integration.domainForksForbidden to true"
                )
            if integration.get("sdkBoundary") != "generated-sdk-through-ports":
                messages.append(
                    f"capability {capability_id or index} must use integration.sdkBoundary generated-sdk-through-ports"
                )

        if capability_id == "commerce":
            messages.extend(self._validate_commerce_standard_capability(capability))

        if maturity == "L3" and not is_externalized:
            for kind in L3_REQUIRED_LAYER_KINDS:
                if kind not in layer_kinds:
                    messages.append(f"capability {capability_id or index} declares L3 but is missing required layer kind: {kind}")
            for category in L3_REQUIRED_QUALITY_GATE_CATEGORIES:
                if category not in quality_gate_categories:
                    messages.append(
                        f"capability {capability_id or index} declares L3 but is missing required quality gate category: {category}"
                    )
        return messages

    def _forks_forbidden(self, integration: dict[str, Any]) -> bool:
        return integration.get("productForksForbidden") is True or integration.get("domainForksForbidden") is True

    def _validate_externalized_capability(
        self,
        capability: dict[str, Any],
        capability_id: str,
        messages: list[str],
    ) -> set[str]:
        external_repository = self._required_string(
            capability,
            "externalRepository",
            f"capability {capability_id}",
            messages,
        )
        if external_repository:
            external_path = Path(external_repository)
            if external_path.is_absolute() or ".." not in external_path.parts:
                messages.append(
                    f"capability {capability_id} externalRepository must use a relative sibling repository path"
                )

        external_layers = capability.get("externalLayers")
        if not isinstance(external_layers, list) or not external_layers:
            messages.append(f"capability {capability_id} externalized status must declare externalLayers")
            return set()

        layer_kinds: set[str] = set()
        for index, layer in enumerate(external_layers):
            if not isinstance(layer, dict):
                messages.append(f"capability {capability_id} external layer at index {index} must be a mapping")
                continue
            kind = self._required_string(
                layer,
                "kind",
                f"capability {capability_id} external layer at index {index}",
                messages,
            )
            relative_path = self._required_string(
                layer,
                "path",
                f"capability {capability_id} external layer {kind or index}",
                messages,
            )
            if kind:
                layer_kinds.add(kind)
            if relative_path and Path(relative_path).is_absolute():
                messages.append(
                    f"capability {capability_id} external layer {kind or index} path must be relative: {relative_path}"
                )
        return layer_kinds

    def _validate_commerce_standard_capability(self, capability: dict[str, Any]) -> list[str]:
        messages: list[str] = []
        scope_values = capability.get("scope", [])
        scope_set: set[str] = set()
        if isinstance(scope_values, list):
            for scope in scope_values:
                if not isinstance(scope, str):
                    continue
                normalized = scope.strip()
                scope_set.add(normalized)
                if "billing" in normalized:
                    messages.append(f"capability commerce must not declare billing scope: {normalized}")
        for required_scope in COMMERCE_UNIFIED_PRODUCT_CENTER_SCOPES:
            if required_scope not in scope_set:
                messages.append(f"capability commerce must declare unified product center scope: {required_scope}")
        for required_scope in COMMERCE_COMPLETE_CLOSURE_SCOPES:
            if required_scope not in scope_set:
                messages.append(f"capability commerce must declare complete commerce closure scope: {required_scope}")

        namespaces = capability.get("sdkNamespaces", [])
        if isinstance(namespaces, list):
            for namespace in namespaces:
                if isinstance(namespace, str) and namespace.strip() == "billing":
                    messages.append("capability commerce must not declare SDK namespace billing")

        tables = capability.get("tables", [])
        if isinstance(tables, list):
            for table in tables:
                if isinstance(table, str) and table.startswith("commerce_billing_") and table != "commerce_billing_history":
                    messages.append(f"capability commerce must not declare billing table: {table}")
        return messages

    def _validate_layers(
        self,
        capability_id: str,
        domain: str | None,
        layers: list[Any],
        messages: list[str],
    ) -> set[str]:
        layer_kinds: set[str] = set()
        for index, layer in enumerate(layers):
            if not isinstance(layer, dict):
                messages.append(f"capability {capability_id} layer at index {index} must be a mapping")
                continue
            kind = self._required_string(layer, "kind", f"capability {capability_id} layer at index {index}", messages)
            relative_path = self._required_string(
                layer,
                "path",
                f"capability {capability_id} layer {kind or index}",
                messages,
            )
            manifest_name = self._required_string(
                layer,
                "manifest",
                f"capability {capability_id} layer {kind or index}",
                messages,
            )
            if kind:
                layer_kinds.add(kind)
            if relative_path:
                if Path(relative_path).is_absolute() or ".." in Path(relative_path).parts:
                    messages.append(f"capability {capability_id} layer {kind or index} path must stay inside sdkwork-appbase")
                    continue
                path = self.appbase_root / relative_path
                if not path.exists():
                    messages.append(f"capability {capability_id} layer {kind or index} path does not exist: {relative_path}")
                    continue
                if domain and not self._layer_path_matches_domain(relative_path, domain):
                    messages.append(f"capability {capability_id} layer {kind or index} path must stay under domain {domain}: {relative_path}")
                if manifest_name and not (path / manifest_name).exists():
                    messages.append(
                        f"capability {capability_id} layer {kind or index} manifest does not exist: {relative_path}/{manifest_name}"
                    )
        return layer_kinds

    def _validate_quality_gates(self, capability_id: str, quality_gates: list[Any], messages: list[str]) -> set[str]:
        categories: set[str] = set()
        for index, quality_gate in enumerate(quality_gates):
            if not isinstance(quality_gate, dict):
                messages.append(f"capability {capability_id} quality gate at index {index} must be a mapping")
                continue
            category = self._required_string(
                quality_gate,
                "category",
                f"capability {capability_id} quality gate at index {index}",
                messages,
            )
            command = self._required_string(
                quality_gate,
                "command",
                f"capability {capability_id} quality gate {category or index}",
                messages,
            )
            if category:
                categories.add(category)
            if command and (
                " --filter " not in f" {command} "
                and "cargo " not in command
                and "python " not in command
                and not self._is_external_pnpm_dir_command(command)
            ):
                messages.append(f"capability {capability_id} quality gate {category or index} command must be directly runnable: {command}")
            if category and command:
                messages.extend(self._validate_quality_gate_command(capability_id, category, command))
        return categories

    def _is_external_pnpm_dir_command(self, command: str) -> bool:
        return re.search(r"\bpnpm\s+--dir\s+\.\./[A-Za-z0-9_.-]+\s+\S+", command) is not None

    def _validate_quality_gate_command(self, capability_id: str, category: str, command: str) -> list[str]:
        messages: list[str] = []
        pnpm_match = re.search(r"\bpnpm\s+--filter\s+(\S+)\s+(\S+)", command)
        if pnpm_match:
            package_name = pnpm_match.group(1).strip("'\"")
            script_name = pnpm_match.group(2).strip("'\"")
            scripts = self._pnpm_package_scripts().get(package_name)
            if scripts is None:
                messages.append(
                    f"capability {capability_id} quality gate {category} references unknown pnpm package: {package_name}"
                )
            elif script_name not in scripts:
                messages.append(
                    f"capability {capability_id} quality gate {category} references missing script {script_name} "
                    f"in package {package_name}"
                )
            return messages

        cargo_match = re.search(r"\bcargo\s+test\s+-p\s+(\S+)", command)
        if cargo_match:
            if re.search(r"\s--manifest-path\s+\.\./", command):
                return messages
            package_name = cargo_match.group(1).strip("'\"")
            if package_name not in self._cargo_package_names():
                messages.append(
                    f"capability {capability_id} quality gate {category} references unknown cargo package: {package_name}"
                )
            return messages

        return messages

    def _validate_forbidden_paths(self) -> list[str]:
        messages: list[str] = []
        if not self.appbase_root.exists():
            return messages
        for path in self._walk(self.appbase_root):
            if path.name in FORBIDDEN_APPBASE_PATH_NAMES:
                messages.append(f"sdkwork-appbase contains forbidden {path.name} path: {self._appbase_relative(path)}")
        return messages

    def _validate_reusable_source_boundaries(self) -> list[str]:
        messages: list[str] = []
        if not self.appbase_root.exists():
            return messages
        packages_root = self.appbase_root / "packages"
        if not packages_root.exists():
            return messages
        for path in self._walk(packages_root):
            if not path.is_file() or path.suffix not in SCANNED_SOURCE_SUFFIXES:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for forbidden_import in FORBIDDEN_REUSABLE_IMPORTS:
                if forbidden_import in text:
                    messages.append(
                        "sdkwork-appbase reusable package imports concrete application SDK "
                        f"{forbidden_import}: {self._appbase_relative(path)}"
                    )
        return messages

    def _walk(self, root: Path) -> list[Path]:
        result: list[Path] = []
        stack = [root]
        while stack:
            current = stack.pop()
            if current.name in IGNORED_DIR_NAMES:
                continue
            result.append(current)
            if current.is_dir():
                stack.extend(current.iterdir())
        return result

    def _pnpm_package_scripts(self) -> dict[str, set[str]]:
        if self._pnpm_packages is not None:
            return self._pnpm_packages
        packages: dict[str, set[str]] = {}
        if not self.appbase_root.exists():
            self._pnpm_packages = packages
            return packages
        for path in self._walk(self.appbase_root / "packages"):
            if not path.is_file() or path.name != "package.json":
                continue
            package = json.loads(path.read_text(encoding="utf-8"))
            name = package.get("name")
            scripts = package.get("scripts", {})
            if isinstance(name, str) and isinstance(scripts, dict):
                packages[name] = {str(script) for script in scripts}
        self._pnpm_packages = packages
        return packages

    def _cargo_package_names(self) -> set[str]:
        if self._cargo_packages is not None:
            return self._cargo_packages
        packages: set[str] = set()
        native_roots = [
            self.appbase_root / "crates",
            self.appbase_root / "packages" / "native-rust",
        ]
        for native_root in native_roots:
            if not native_root.exists():
                continue
            for path in self._walk(native_root):
                if not path.is_file() or path.name != "Cargo.toml":
                    continue
                text = path.read_text(encoding="utf-8")
                match = re.search(r'(?m)^\s*name\s*=\s*"([^"]+)"', text)
                if match:
                    packages.add(match.group(1))
        self._cargo_packages = packages
        return packages

    def _layer_path_matches_domain(self, relative_path: str, domain: str) -> bool:
        path = Path(relative_path)
        posix_path = self._posix(relative_path)
        if f"/{domain}/" in posix_path:
            return True
        if path.parts and path.parts[0] == "crates":
            crate_name = path.name
            return crate_name == f"sdkwork-{domain}" or crate_name.startswith(f"sdkwork-{domain}-")
        return False

    def _required_string(self, payload: dict[str, Any], key: str, subject: str, messages: list[str]) -> str | None:
        value = payload.get(key)
        if not isinstance(value, str) or not value.strip():
            messages.append(f"{subject} must declare non-empty {key}")
            return None
        return value.strip()

    def _display_path(self, path: Path) -> str:
        try:
            return self._posix(path.relative_to(self.root))
        except ValueError:
            return self._posix(path)

    def _appbase_relative(self, path: Path) -> str:
        return self._posix(path.relative_to(self.appbase_root))

    def _posix(self, path: Path | str) -> str:
        return str(path).replace("\\", "/")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate sdkwork-appbase reusable capability building-block standards.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--manifest", type=Path, default=None, help="appbase capability manifest path")
    args = parser.parse_args()

    result = AppbaseCapabilityGuardian(root=args.root, manifest_path=args.manifest).run()
    if result.ok:
        print("Appbase capability guardian passed")
        return 0
    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
