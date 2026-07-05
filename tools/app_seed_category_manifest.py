from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class AppCategorySeedManifestCheckResult:
    ok: bool
    messages: list[str]


class AppCategorySeedManifestGenerator:
    """Generate /data/app PlusCategory seed data from the app seed bundle."""

    KIND = "sdkwork.c_category.app_seed"
    APP_SEED_KIND = "sdkwork.platform_app.seed"
    EXPLICIT_CATEGORY_IDS = {
        "app-store-html": 20_002_001,
        "app-store-react": 20_002_002,
        "app-store-flutter": 20_002_003,
    }

    def __init__(
        self,
        root: Path,
        seed_path: Path | None = None,
        output_path: Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.seed_path = (
            Path(seed_path).resolve()
            if seed_path is not None
            else self.root / "data" / "app" / "sdkwork-apps.json"
        )
        self.output_path = (
            Path(output_path).resolve()
            if output_path is not None
            else self.root / "data" / "app" / "sdkwork-app-categories.json"
        )

    def generate(self) -> dict[str, Any]:
        seed = self._load_seed()
        apps = seed.get("apps", [])
        if not isinstance(apps, list):
            apps = []

        categories = self._categories(seed)
        return {
            "schemaVersion": 1,
            "kind": self.KIND,
            "count": len(categories),
            "source": {
                "appSeedKind": self._string(seed.get("kind")) or self.APP_SEED_KIND,
                "appCount": self._integer(seed.get("count"), len(apps)),
                "appSeedSource": seed.get("source") if isinstance(seed.get("source"), dict) else None,
            },
            "categories": categories,
        }

    def render_json(self) -> str:
        return json.dumps(self.generate(), ensure_ascii=False, indent=2) + "\n"

    def write(self, output_path: Path | None = None) -> Path:
        target = Path(output_path) if output_path is not None else self.output_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.render_json(), encoding="utf-8", newline="\n")
        return target

    def check(self, output_path: Path | None = None) -> AppCategorySeedManifestCheckResult:
        target = Path(output_path) if output_path is not None else self.output_path
        if not target.exists():
            return AppCategorySeedManifestCheckResult(
                ok=False,
                messages=[f"app category seed manifest is missing: {target}"],
            )
        expected = self.render_json()
        actual = target.read_text(encoding="utf-8")
        if actual != expected:
            return AppCategorySeedManifestCheckResult(
                ok=False,
                messages=[f"app category seed manifest is stale: {target}"],
            )
        return AppCategorySeedManifestCheckResult(ok=True, messages=[])

    def _load_seed(self) -> dict[str, Any]:
        payload = json.loads(self.seed_path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError(f"app seed bundle must be a JSON object: {self.seed_path}")
        return payload

    def _categories(self, seed: dict[str, Any]) -> list[dict[str, Any]]:
        names = {
            category
            for app in self._list(seed.get("apps"))
            for category in [self._portal_category(app)]
            if category
        }
        return [
            self._category(index, name)
            for index, name in enumerate(
                sorted(names, key=lambda value: f"app-store-{self._normalize_code(value)}")
            )
        ]

    def _category(self, index: int, name: str) -> dict[str, Any]:
        normalized = self._normalize_code(name)
        code = f"app-store-{normalized}"
        return {
            "id": self._category_id(code),
            "uuid": f"sdkwork-app-category-{normalized}",
            "name": name,
            "description": f"{name} SDKWork app category",
            "code": code,
            "tags": ["sdkwork-app", normalized],
            "icon": self._media_resource(
                f"https://cdn.sdkwork.com/app-categories/{normalized}.svg",
                "image",
            ),
            "sortWeight": 100 + index,
            "path": f"/app-store/{normalized}",
        }

    def _media_resource(self, url: str, kind: str) -> dict[str, str]:
        return {
            "kind": kind,
            "source": "external_url",
            "url": url,
            "publicUrl": url,
        }

    def _portal_category(self, app: Any) -> str:
        if not isinstance(app, dict):
            return ""
        for key in ("platformApp",):
            app_record = app.get(key)
            if not isinstance(app_record, dict):
                continue
            config = app_record.get("config")
            if not isinstance(config, dict):
                continue
            portal = config.get("portal")
            if not isinstance(portal, dict):
                continue
            category = self._string(portal.get("category")).strip()
            if category:
                return category
        return ""

    def _category_id(self, code: str) -> int:
        return self.EXPLICIT_CATEGORY_IDS.get(code, 20_002_000 + self._stable_hash_mod(code, 900_000))

    def _stable_hash_mod(self, value: str, modulo: int) -> int:
        hash_value = 14_695_981_039_346_656_037
        for byte in value.encode("utf-8"):
            hash_value ^= byte
            hash_value = (hash_value * 1_099_511_628_211) & ((1 << 64) - 1)
        return hash_value % modulo

    def _normalize_code(self, value: str) -> str:
        normalized: list[str] = []
        last_dash = False
        for char in value.strip():
            if char.isascii() and char.isalnum():
                normalized.append(char.lower())
                last_dash = False
            elif not last_dash:
                normalized.append("-")
                last_dash = True
        return "".join(normalized).strip("-")

    def _list(self, value: Any) -> list[Any]:
        return value if isinstance(value, list) else []

    def _string(self, value: Any) -> str:
        return value if isinstance(value, str) else ""

    def _integer(self, value: Any, fallback: int) -> int:
        return value if isinstance(value, int) else fallback


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate SDKWork app PlusCategory seed manifest.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--seed", type=Path, default=None, help="sdkwork-apps.json path")
    parser.add_argument("--output", type=Path, default=None, help="sdkwork-app-categories.json output path")
    parser.add_argument("--check", action="store_true", help="validate that the category seed manifest is current")
    args = parser.parse_args()

    generator = AppCategorySeedManifestGenerator(
        root=args.root,
        seed_path=args.seed,
        output_path=args.output,
    )
    if args.check:
        result = generator.check(args.output)
        if result.ok:
            print("App category seed manifest is current")
            return 0
        for message in result.messages:
            print(message)
        return 1

    output = generator.write(args.output)
    print(f"Wrote app category seed manifest to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
