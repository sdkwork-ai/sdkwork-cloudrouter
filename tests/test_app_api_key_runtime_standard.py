import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RETIRED_CHANNEL_FIELD = "channel" + "Group"
RETIRED_COPY_FIELD = "copyable" + "Key"


def read_text(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def rust_struct(source: str, name: str) -> str:
    marker = f"struct {name} {{"
    start = source.index(marker)
    end = source.index("\n}", start)
    return source[start:end]


def sql_table(source: str, name: str) -> str:
    marker = f"CREATE TABLE IF NOT EXISTS {name} ("
    start = source.index(marker)
    end = source.index("\n);", start)
    return source[start:end]


class AppApiKeyRuntimeStandardTest(unittest.TestCase):
    def test_app_api_key_runtime_uses_persistent_postgres_ports(self) -> None:
        routes = read_text("crates/sdkwork-routes-clawrouter-app-api/src/routes.rs")

        self.assertIn("fn app_api_key_runtime_deps_for_postgres(", routes)
        self.assertIn("PostgresPricingCatalogLoader::with_credential_secret_codec", routes)
        self.assertIn("PostgresGatewayApiKeyCommandStore::new(pool)", routes)
        self.assertIn("HmacSha256ApiKeySecretHasher::new", routes)
        self.assertIn("app_api_key_router_with_read_store_and_command_store", routes)
        self.assertNotIn("InMemoryGatewayApiKey", routes)

    def test_create_contract_returns_raw_key_exactly_once(self) -> None:
        openapi = json.loads(read_text("generated/openapi/clawrouter-app-openapi.json"))
        schemas = openapi["components"]["schemas"]
        create_response = schemas["CreateApiKeyResponse"]
        item = schemas["AppApiKeyItem"]

        self.assertEqual(["item", "rawKey"], create_response["required"])
        self.assertEqual({"item", "rawKey"}, set(create_response["properties"]))
        self.assertIn("exactly once", create_response["properties"]["rawKey"]["description"])
        self.assertNotIn("rawKey", item["properties"])
        self.assertNotIn(RETIRED_COPY_FIELD, item["properties"])
        self.assertIn("accountGroup", item["properties"])
        self.assertNotIn(RETIRED_CHANNEL_FIELD, item["properties"])

    def test_create_sdk_preserves_composite_response(self) -> None:
        sdk = read_text(
            "sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/src/api/iam.ts"
        )
        response_type = read_text(
            "sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/src/types/create-api-key-response.ts"
        )

        self.assertIn(
            "create(body: CreateApiKeyRequest, params: IamApiKeysCreateParams, "
            "requestOptions?: ApiRequestOptions): Promise<CreateApiKeyResponse>",
            sdk,
        )
        self.assertIn("sdkworkUnwrapKind: 'data'", sdk)
        self.assertIn("item: AppApiKeyItem", response_type)
        self.assertIn("rawKey: string", response_type)

    def test_frontend_uses_generated_sdk_and_keeps_secret_ephemeral(self) -> None:
        service = read_text(
            "apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-console-api-keys/src/apiKeyService.ts"
        )
        view = read_text(
            "apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx"
        )

        self.assertIn("getClawRouterAppSdkClient().iam.apiKeys.create", service)
        self.assertIn("const data = readApiRecord(result);", service)
        self.assertIn("const rawKey = readString(data, 'rawKey');", service)
        self.assertIn("const key = normalizeCreatedApiKey(data.item);", service)
        self.assertIn("return { key, rawKey };", service)
        self.assertNotIn(RETIRED_COPY_FIELD, service)
        self.assertNotIn("localStorage", service + view)
        self.assertNotIn("sessionStorage", service + view)
        self.assertIn("created.push({ key: result.key, rawKey: result.rawKey })", view)

    def test_list_and_update_contracts_never_expose_secret_material(self) -> None:
        openapi = json.loads(read_text("generated/openapi/clawrouter-app-openapi.json"))
        schemas = openapi["components"]["schemas"]
        item_properties = set(schemas["AppApiKeyItem"]["properties"])
        update_properties = set(schemas["UpdateApiKeyRequest"]["properties"])

        self.assertEqual(
            {
                "id",
                "name",
                "maskedKey",
                "accountGroup",
                "accountGroupName",
                "rate",
                "quota",
                "usedQuota",
                "modalities",
                "ipLimit",
                "created",
                "expires",
                "status",
                "defaultForRuntime",
            },
            item_properties,
        )
        self.assertNotIn("rawKey", update_properties)
        self.assertNotIn(RETIRED_COPY_FIELD, update_properties)

    def test_rust_response_separates_create_secret_from_metadata(self) -> None:
        route = read_text(
            "services/sdkwork-clawrouter-router-service/src/api/app_api_keys.rs"
        )
        create_response = rust_struct(route, "AppApiKeyCreateResponse")
        item_response = rust_struct(route, "AppApiKeyItemResponse")

        self.assertIn("item: AppApiKeyItemResponse", create_response)
        self.assertIn("raw_key: String", create_response)
        self.assertNotIn("raw_key", item_response)
        self.assertNotIn("key_hash", item_response)
        self.assertIn("account_group: String", item_response)
        self.assertNotIn("channel_group", item_response)
        self.assertIn("json_created_response(", route)
        self.assertIn("no_content_response(None)", route)

    def test_api_key_storage_is_hash_only_and_idempotent(self) -> None:
        schema = read_text("generated/schema/postgres/schema.sql")
        table = sql_table(schema, "iam_gateway_api_key")
        store = read_text(
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/"
            "postgres/api_key_command_store.rs"
        )
        port = read_text(
            "services/sdkwork-clawrouter-router-service/src/ports/api_key_command_store.rs"
        )

        self.assertIn("key_hash VARCHAR(128) NOT NULL", table)
        self.assertIn("idempotency_key VARCHAR(128) NOT NULL", table)
        self.assertNotIn("raw_key", table)
        self.assertNotIn("ciphertext", table)
        self.assertNotIn("encrypted", table)
        self.assertIn("ensure_idempotency_key_available", store)
        self.assertIn("INSERT INTO ops_audit_log", store)
        self.assertIn(".bind(&command.request_id)", store)
        self.assertIn("pub key_hash: String", port)
        self.assertNotIn("pub raw_key", port)

    def test_account_group_binding_schema_supports_multiple_authorizations(self) -> None:
        schema = read_text("generated/schema/postgres/schema.sql")
        binding = sql_table(schema, "iam_gateway_api_key_account_group")
        routing_store = read_text(
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/"
            "postgres/app_routing_read_store.rs"
        )

        for column in [
            "api_key_id BIGINT NOT NULL",
            "account_group_id BIGINT NOT NULL",
            "binding_role VARCHAR(32) NOT NULL",
            "priority INTEGER NOT NULL",
            "weight INTEGER NOT NULL",
        ]:
            self.assertIn(column, binding)
        self.assertIn("FROM iam_gateway_api_key_account_group b", routing_store)
        self.assertIn("b.binding_role = 'route'", routing_store)

    def test_account_group_naming_is_consistent_across_contract_and_runtime(self) -> None:
        sources = "\n".join(
            [
                read_text("docs/schema-registry/frontend-field-contracts.yaml"),
                read_text(
                    "services/sdkwork-clawrouter-router-service/src/api/app_api_keys.rs"
                ),
                read_text(
                    "apps/sdkwork-clawrouter-pc/packages/"
                    "sdkwork-clawrouter-pc-console-api-keys/src/apiKeyService.ts"
                ),
                read_text(
                    "sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/"
                    "src/types/create-api-key-request.ts"
                ),
            ]
        )

        self.assertIn("accountGroup", sources)
        self.assertIn("account_group", sources)
        self.assertNotIn(RETIRED_CHANNEL_FIELD, sources)
        self.assertNotIn("channel_group", sources)

    def test_app_routes_apply_authenticated_subject_boundary(self) -> None:
        routes = read_text("crates/sdkwork-routes-clawrouter-app-api/src/routes.rs")
        auth = read_text("crates/sdkwork-claw-http/src/auth.rs")
        handler = read_text(
            "services/sdkwork-clawrouter-router-service/src/api/app_api_keys.rs"
        )

        self.assertIn("merge_web_framework_scoped_app_router", routes)
        self.assertIn("verify_app_session_authorization_header", auth)
        self.assertIn("remove_internal_trusted_subject_headers", auth)
        self.assertIn("RequiredAppSqlScopedSubject", handler)
        self.assertNotIn("x-sdkwork-tenant-id", read_text(
            "apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-console-api-keys/src/apiKeyService.ts"
        ).lower())


if __name__ == "__main__":
    unittest.main()
