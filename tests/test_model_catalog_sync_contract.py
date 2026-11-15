import json
import unittest
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "architecture" / "tech" / "assets"
OPEN_API = ASSETS / "model-catalog-sync.open-api.openapi.json"
APP_API = ASSETS / "model-catalog-sync.app-api.openapi.json"
STANDARD = ROOT / "docs" / "architecture" / "tech" / "TECH-2026-11-15-model-catalog-sync-api.md"

HTTP_METHODS = {"get", "put", "post", "delete", "patch", "head", "options", "trace"}


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def iter_refs(node, file: Path):
    """Yield (containing_file, ref) for every `$ref`, including external refs."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "$ref" and isinstance(value, str):
                yield file, value
            else:
                yield from iter_refs(value, file)
    elif isinstance(node, list):
        for value in node:
            yield from iter_refs(value, file)


def resolve_ref(containing_file: Path, ref: str):
    """Resolve a local or file-relative JSON pointer; return None when missing."""
    file_part, _, pointer = ref.partition("#")
    target_file = containing_file if file_part == "" else (containing_file.parent / file_part).resolve()
    try:
        node = load(target_file)
    except (OSError, json.JSONDecodeError):
        return None
    if pointer == "":
        return node
    if not pointer.startswith("/"):
        return None
    for token in pointer[1:].split("/"):
        token = unquote(token).replace("~1", "/").replace("~0", "~")
        if not isinstance(node, dict) or token not in node:
            return None
        node = node[token]
    return node


class ModelCatalogSyncContractTest(unittest.TestCase):
    def test_fragments_are_openapi_31(self) -> None:
        for path in (OPEN_API, APP_API):
            with self.subTest(path=path.name):
                document = load(path)
                self.assertEqual("3.1.2", document["openapi"])
                self.assertRegex(document["info"]["version"], r"^\d+\.\d+\.\d+$")
                self.assertIn("x-sdkwork-api-surface", document["info"])

    def test_open_api_paths_and_version_headers(self) -> None:
        document = load(OPEN_API)
        expected = {
            "/v1/model_catalog": "modelCatalog.retrieve",
            "/v1/model_catalog/changes": "modelCatalog.listChanges",
            "/v1/model_catalog/vendors": "modelCatalog.listVendors",
            "/v1/model_catalog/models/{vendor_code}/{model_id}": "modelCatalog.retrieveModel",
            "/v1/model_catalog/parameters": "modelCatalog.listParameters",
        }
        for path, operation_id in expected.items():
            with self.subTest(path=path):
                operation = document["paths"][path]["get"]
                self.assertEqual(operation_id, operation["operationId"])

        headers = document["paths"]["/v1/model_catalog"]["get"]["responses"]["200"]["headers"]
        for header in ("ETag", "X-Catalog-Revision", "X-Catalog-Version", "X-Catalog-Schema-Version"):
            self.assertIn(header, headers)

    def test_app_api_paths_wrap_shared_resources(self) -> None:
        document = load(APP_API)
        expected = {
            "/app/v3/api/ai/model_catalog": "modelCatalog.retrieve",
            "/app/v3/api/ai/model_catalog/changes": "modelCatalog.listChanges",
            "/app/v3/api/ai/model_catalog/vendors": "modelCatalog.listVendors",
            "/app/v3/api/ai/model_catalog/models/{vendor_code}/{model_id}": "modelCatalog.retrieveModel",
            "/app/v3/api/ai/model_catalog/parameters": "modelCatalog.listParameters",
        }
        for path, operation_id in expected.items():
            with self.subTest(path=path):
                operation = document["paths"][path]["get"]
                self.assertEqual(operation_id, operation["operationId"])

        snapshot_ref = document["components"]["schemas"]["CatalogSnapshotEnvelope"]["allOf"][1]["properties"]["data"]["$ref"]
        self.assertTrue(snapshot_ref.startswith("./model-catalog-sync.open-api.openapi.json"))
        self.assertEqual("model_catalog", resolve_ref(APP_API, snapshot_ref)["properties"]["object"]["const"])

    def test_operation_ids_and_security_are_complete(self) -> None:
        for path in (OPEN_API, APP_API):
            with self.subTest(path=path.name):
                document = load(path)
                seen: set[str] = set()
                operations = 0
                for path_item in document["paths"].values():
                    for method, operation in path_item.items():
                        if method not in HTTP_METHODS:
                            continue
                        operations += 1
                        operation_id = operation["operationId"]
                        self.assertNotIn(operation_id, seen, f"duplicate operation id {operation_id}")
                        seen.add(operation_id)
                        self.assertIn("200", operation["responses"])
                        self.assertTrue(operation.get("security", document.get("security")))
                self.assertGreater(operations, 0)

    def test_every_ref_resolves(self) -> None:
        for path in (OPEN_API, APP_API):
            document = load(path)
            with self.subTest(path=path.name):
                for containing_file, ref in iter_refs(document, path):
                    self.assertIsNotNone(
                        resolve_ref(containing_file, ref),
                        f"{path.name}: unresolved $ref {ref}",
                    )

    def test_version_and_sync_fields_are_present(self) -> None:
        schemas = load(OPEN_API)["components"]["schemas"]
        snapshot_fields = schemas["CatalogSnapshot"]["properties"]
        for field in ("schemaVersion", "catalogVersion", "revision", "parameterRegistryVersion", "updatedAt", "pageInfo"):
            self.assertIn(field, snapshot_fields)
        delta_fields = schemas["CatalogDelta"]["properties"]
        for field in ("baseRevision", "revision", "tombstones", "hasMore", "nextSinceRevision"):
            self.assertIn(field, delta_fields)
        descriptor_fields = schemas["ParameterDescriptor"]["properties"]
        for field in ("name", "wireName", "type", "enum", "minimum", "maximum", "default", "protocols", "status", "extensions"):
            self.assertIn(field, descriptor_fields)
        model_fields = schemas["CatalogModel"]["properties"]
        for field in ("catalogKey", "parameters", "defaultParameters", "parameterConstraints", "extensions"):
            self.assertIn(field, model_fields)

        presentation_fields = schemas["CatalogPresentation"]["properties"]
        for field in (
            "openApiEnabled",
            "appApiEnabled",
            "includeParameters",
            "includePricing",
            "includeExtensions",
            "exposeDeprecatedModels",
            "defaultPageSize",
            "maxPageSize",
            "vendorOrder",
        ):
            self.assertIn(field, presentation_fields)
        self.assertIn("presentation", snapshot_fields)

    def test_standard_is_linked_from_the_architecture_index(self) -> None:
        self.assertTrue(STANDARD.is_file())
        index = (ROOT / "docs" / "architecture" / "tech" / "TECH_ARCHITECTURE.md").read_text(encoding="utf-8")
        self.assertIn(STANDARD.name, index)


if __name__ == "__main__":
    unittest.main()
