from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

_FRAMEWORK_TOOLS_ROOT = Path(__file__).resolve().parents[2] / "sdkwork-web-framework" / "tools"
if _FRAMEWORK_TOOLS_ROOT.is_dir() and str(_FRAMEWORK_TOOLS_ROOT) not in sys.path:
    sys.path.insert(0, str(_FRAMEWORK_TOOLS_ROOT))

from schema_registry.composer import (  # noqa: E402
    SchemaRegistryComposer,
    SchemaRegistryLoadError,
    load_schema_registry as _load_schema_registry,
    render_schema_registry as _render_schema_registry,
    schema_registry_source_paths as _schema_registry_source_paths,
)

SchemaRegistryLoadError = SchemaRegistryLoadError


def _infer_app_root(registry_path: Path) -> Path:
    resolved = registry_path.resolve()
    for candidate in [resolved.parent, *resolved.parents]:
        if (candidate / "database" / "database.manifest.json").is_file():
            return candidate
        if (candidate / "sdkwork.app.config.json").is_file():
            return candidate
    return resolved.parent.parent.parent


def load_schema_registry(path: Path, *, app_root: Path | None = None) -> dict[str, Any]:
    """Load a Schema Registry YAML file and compose fragments plus dependency registries."""
    registry_path = Path(path).resolve()
    resolved_root = Path(app_root).resolve() if app_root is not None else _infer_app_root(registry_path)
    return _load_schema_registry(registry_path, app_root=resolved_root)


def render_schema_registry(path: Path, *, app_root: Path | None = None) -> str:
    """Render the effective registry as YAML, including tables from fragments and dependencies."""
    registry_path = Path(path).resolve()
    resolved_root = Path(app_root).resolve() if app_root is not None else _infer_app_root(registry_path)
    return _render_schema_registry(registry_path, app_root=resolved_root)


def schema_registry_source_paths(path: Path, *, app_root: Path | None = None) -> list[Path]:
    """Return the entry file plus all declared table fragment and dependency registry files."""
    registry_path = Path(path).resolve()
    resolved_root = Path(app_root).resolve() if app_root is not None else _infer_app_root(registry_path)
    return _schema_registry_source_paths(registry_path, app_root=resolved_root)
