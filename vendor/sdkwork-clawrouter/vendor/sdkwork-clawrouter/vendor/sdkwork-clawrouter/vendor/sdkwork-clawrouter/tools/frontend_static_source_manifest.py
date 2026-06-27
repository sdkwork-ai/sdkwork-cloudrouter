from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised only on missing tooling
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None


@dataclass(frozen=True)
class FrontendStaticSourceManifestResult:
    ok: bool
    messages: list[str]


class FrontendStaticSourceManifest:
    """Generate deterministic static content source snapshots for frontend route audits."""

    SNAPSHOTS_SCHEMA = "sdkwork-clawrouter-frontend-static-source-snapshots"
    MANIFEST_SCHEMA = "sdkwork-clawrouter-frontend-static-source-manifest"
    ALLOWED_STATIC_DELIVERY_MODES = frozenset(
        {
            "curated_seed_content",
            "generated_reference_snapshot",
            "published_catalog_snapshot",
        }
    )
    ISO_DATE_OR_DATETIME_PATTERN = re.compile(
        r"^\d{4}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-][0-2]\d:[0-5]\d)?)?$"
    )

    def __init__(
        self,
        root: Path,
        snapshots_path: Path | None = None,
        output_path: Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.snapshots_path = (
            Path(snapshots_path).resolve()
            if snapshots_path is not None
            else self.root / "docs" / "schema-registry" / "frontend-static-source-snapshots.yaml"
        )
        self.output_path = (
            Path(output_path).resolve()
            if output_path is not None
            else self.root / "generated" / "schema" / "frontend" / "frontend-static-source-manifest.json"
        )

    def generate(self) -> dict[str, Any]:
        snapshots: dict[str, dict[str, Any]] = {}
        for snapshot in self._snapshot_entries():
            snapshot_id = snapshot["id"]
            source_path = (self.root / snapshot["source_ref"]).resolve()
            snapshots[snapshot_id] = {
                "id": snapshot_id,
                "route": snapshot["route"],
                "mode": snapshot["mode"],
                "source_ref": snapshot["source_ref"],
                "observed_at": snapshot["observed_at"],
                "source_hash": "sha256:" + hashlib.sha256(source_path.read_bytes()).hexdigest(),
                "schema_tables": self._string_list(snapshot.get("schema_tables")),
            }

        return {
            "schema": self.MANIFEST_SCHEMA,
            "version": 1,
            "source": self._display_path(self.snapshots_path),
            "snapshots": dict(sorted(snapshots.items())),
        }

    def render_json(self) -> str:
        return json.dumps(self.generate(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    def write(self, output_path: Path | None = None) -> Path:
        target = Path(output_path) if output_path is not None else self.output_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.render_json(), encoding="utf-8")
        return target

    def check(self, output_path: Path | None = None) -> FrontendStaticSourceManifestResult:
        validation = self.validate()
        if not validation.ok:
            return validation

        target = Path(output_path) if output_path is not None else self.output_path
        expected = self.render_json()
        if not target.exists():
            return FrontendStaticSourceManifestResult(
                ok=False,
                messages=[f"frontend static source manifest is missing: {target}"],
            )
        actual = target.read_text(encoding="utf-8")
        if actual != expected:
            return FrontendStaticSourceManifestResult(
                ok=False,
                messages=[f"frontend static source manifest is stale: {target}"],
            )
        return FrontendStaticSourceManifestResult(ok=True, messages=[])

    def validate(self) -> FrontendStaticSourceManifestResult:
        messages: list[str] = []
        snapshots = self._load_snapshots()
        if snapshots.get("schema") != self.SNAPSHOTS_SCHEMA:
            messages.append(f"frontend static source snapshots schema must be {self.SNAPSHOTS_SCHEMA}")
        if snapshots.get("version") != 1:
            messages.append("frontend static source snapshots version must be 1")

        entries = snapshots.get("snapshots", [])
        if not isinstance(entries, list):
            return FrontendStaticSourceManifestResult(
                ok=False,
                messages=messages + ["frontend static source snapshots must be a list"],
            )

        ids: list[str] = []
        for raw_entry in entries:
            if not isinstance(raw_entry, dict):
                messages.append("frontend static source snapshot entries must be mappings")
                continue
            snapshot_id = raw_entry.get("id")
            route = raw_entry.get("route")
            mode = raw_entry.get("mode")
            source_ref = raw_entry.get("source_ref")
            observed_at = raw_entry.get("observed_at")
            schema_tables = self._string_list(raw_entry.get("schema_tables"))

            display_id = snapshot_id if isinstance(snapshot_id, str) and snapshot_id else "<missing>"
            if not isinstance(snapshot_id, str) or not snapshot_id.strip():
                messages.append("frontend static source snapshot must declare id")
            else:
                ids.append(snapshot_id)

            if not isinstance(route, str) or not route.startswith("/"):
                messages.append(f"frontend static source snapshot {display_id} route must be an absolute portal route")
            elif isinstance(snapshot_id, str) and snapshot_id != f"static-route:{route}":
                messages.append(
                    f"frontend static source snapshot {display_id} id must equal static-route:{route}"
                )

            if mode not in self.ALLOWED_STATIC_DELIVERY_MODES:
                messages.append(
                    f"frontend static source snapshot {display_id} mode must be one of "
                    f"{', '.join(sorted(self.ALLOWED_STATIC_DELIVERY_MODES))}"
                )

            messages.extend(self._validate_source_ref(display_id, source_ref))

            if not isinstance(observed_at, str) or not self.ISO_DATE_OR_DATETIME_PATTERN.match(observed_at):
                messages.append(
                    f"frontend static source snapshot {display_id} observed_at must be an ISO date or datetime"
                )
            if not schema_tables:
                messages.append(f"frontend static source snapshot {display_id} must declare schema_tables")

        for snapshot_id in sorted(set(ids)):
            if ids.count(snapshot_id) > 1:
                messages.append(f"frontend static source snapshot has duplicate id: {snapshot_id}")

        return FrontendStaticSourceManifestResult(ok=not messages, messages=messages)

    def _validate_source_ref(self, snapshot_id: str, source_ref: Any) -> list[str]:
        if not isinstance(source_ref, str) or not source_ref.strip():
            return [
                f"frontend static source snapshot {snapshot_id} source_ref must be a repo-relative path"
            ]

        source_path = Path(source_ref)
        if source_path.is_absolute() or ".." in source_path.parts:
            return [
                f"frontend static source snapshot {snapshot_id} source_ref must be a repo-relative path"
            ]

        resolved = (self.root / source_ref).resolve()
        try:
            resolved.relative_to(self.root)
        except ValueError:
            return [
                f"frontend static source snapshot {snapshot_id} source_ref must stay inside repository"
            ]
        if not resolved.is_file():
            return [
                f"frontend static source snapshot {snapshot_id} source_ref does not exist: {source_ref}"
            ]
        return []

    def _snapshot_entries(self) -> list[dict[str, Any]]:
        snapshots = self._load_snapshots().get("snapshots", [])
        if not isinstance(snapshots, list):
            return []
        return [
            snapshot
            for snapshot in snapshots
            if isinstance(snapshot, dict)
            and isinstance(snapshot.get("id"), str)
            and isinstance(snapshot.get("route"), str)
            and isinstance(snapshot.get("mode"), str)
            and isinstance(snapshot.get("source_ref"), str)
            and isinstance(snapshot.get("observed_at"), str)
        ]

    def _load_snapshots(self) -> dict[str, Any]:
        if yaml is None:
            raise RuntimeError("PyYAML is required to load frontend static source snapshots") from _YAML_IMPORT_ERROR
        if not self.snapshots_path.exists():
            return {"snapshots": []}
        snapshots = yaml.safe_load(self.snapshots_path.read_text(encoding="utf-8"))
        if snapshots is None:
            return {"snapshots": []}
        if not isinstance(snapshots, dict):
            raise ValueError("frontend static source snapshots root must be a mapping")
        return snapshots

    def _string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, str)]

    def _display_path(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return path.as_posix()


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate frontend static source manifest from snapshot registry.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--snapshots", type=Path, default=None, help="frontend static source snapshots YAML path")
    parser.add_argument("--output", type=Path, default=None, help="frontend static source manifest JSON path")
    parser.add_argument("--check", action="store_true", help="validate that the generated manifest is current")
    args = parser.parse_args()

    generator = FrontendStaticSourceManifest(
        root=args.root,
        snapshots_path=args.snapshots,
        output_path=args.output,
    )
    if args.check:
        result = generator.check(args.output)
        if result.ok:
            print("Frontend static source manifest is current")
            return 0
        for message in result.messages:
            print(message)
        return 1

    validation = generator.validate()
    if not validation.ok:
        for message in validation.messages:
            print(message)
        return 1

    output = generator.write(args.output)
    print(f"Wrote frontend static source manifest to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
