import unittest
from pathlib import Path

from tools.api_contract_manifest import ApiContractManifestGenerator


ROOT = Path(__file__).resolve().parents[1]


class AdminUserRuntimeStandardTest(unittest.TestCase):
    def test_product_owned_admin_api_key_create_contract_uses_operation_specific_payloads(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {operation["key"]: operation for operation in manifest["operations"]}
        source = "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-user/src/userService.ts"

        create_api_key = operations[f"{source}#createApiKey"]

        self.assertEqual("AdminApiKeyCreateRequest", create_api_key["request_schema"]["name"])
        self.assertEqual(["userId", "name"], create_api_key["request_schema"]["schema"]["required"])
        self.assertEqual(
            {
                "type": "string",
                "format": "int64",
                "pattern": "^[1-9][0-9]*$",
                "x-sdkwork-int64-string": True,
                "x-sdkwork-rust-type": "i64",
                "description": "User identifier that owns the API key.",
            },
            create_api_key["request_schema"]["schema"]["properties"]["userId"],
        )
        self.assertEqual("AdminApiKeyCreateResponse", create_api_key["response_schema"]["name"])
        self.assertTrue(create_api_key["idempotency_required"])
        self.assertEqual("/backend/v3/api/iam/api_keys", create_api_key["api_path"])
        self.assertEqual("POST", create_api_key["api_method"])
        self.assertTrue(create_api_key["openapi_exposed"])

    def test_admin_user_service_splits_appbase_iam_and_product_api_key_sdk_surfaces(self) -> None:
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-user"
            / "src"
            / "userService.ts"
        ).read_text(encoding="utf-8")
        iam_api = (ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "generated" / "server-openapi" / "src" / "api" / "iam.ts").read_text(
            encoding="utf-8"
        )
        type_exports = (
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "generated" / "server-openapi" / "src" / "types" / "index.ts"
        ).read_text(encoding="utf-8")

        for token in [
            "AdminApiKeyCreateRequest",
            "toCreateUserRequest",
            "toUpdateUserRequest",
            "toCreateApiKeyRequest",
            "createIdempotencyParams('admin-api-key-create')",
        ]:
            self.assertIn(token, service)

        self.assertNotIn(".user.add(user)", service)
        self.assertNotIn("router.updateBalance(id, { amount, type })", service)
        self.assertNotIn(".user.updateUser({ id, ...updates })", service)
        self.assertNotIn(".apikey.createApiKey({ userId, name })", service)
        self.assertNotIn("as unknown as Record<string, unknown>", service)
        self.assertNotIn("updateBalance", service)
        self.assertNotIn("toBalanceAdjustmentRequest", service)
        self.assertNotIn("UserBalanceAdjustmentInput", service)
        self.assertIn("getSdkworkAppbaseBackendSdkClient().iam.users.list", service)
        self.assertIn("getSdkworkAppbaseBackendSdkClient().iam.users.create", service)
        self.assertIn("getSdkworkAppbaseBackendSdkClient().iam.users.update", service)
        self.assertIn("getSdkworkAppbaseBackendSdkClient().iam.apiKeys.list", service)
        self.assertIn("getClawRouterBackendSdkClient().iam.apiKeys.create", service)
        self.assertIn("getClawRouterBackendSdkClient().iam.apiKeys.delete", service)
        self.assertNotIn("getClawRouterBackendSdkClient().iam.users.list", service)
        self.assertNotIn("getClawRouterBackendSdkClient().iam.users.create", service)
        self.assertNotIn("getClawRouterBackendSdkClient().iam.users.update", service)
        self.assertNotIn("getClawRouterBackendSdkClient().iam.apiKeys.list", service)
        self.assertNotIn("getClawRouterBackendSdkClient().iam.apiKeys.revoke", service)
        self.assertNotIn("getSdkworkAppbaseBackendSdkClient().iam.apiKeys.create", service)
        self.assertNotIn("getSdkworkAppbaseBackendSdkClient().iam.apiKeys.delete", service)
        self.assertNotIn("getSdkworkAppbaseBackendSdkClient().iam.apiKeys.revoke", service)
        self.assertNotIn("getClawRouterBackendSdkClient().system.users.create", service)
        self.assertNotIn("getClawRouterBackendSdkClient().system.users.update", service)

        self.assertNotIn("async create(body?: OperationRequest): Promise<PlusApiResult>", iam_api)
        self.assertNotIn("async update(body?: OperationRequest): Promise<PlusApiResult>", iam_api)

        self.assertIn(
            "async create(body: AdminApiKeyCreateRequest, params: IamApiKeysCreateParams): Promise<ApiKeysCreateResult>",
            iam_api,
        )
        self.assertIn(
            "async delete(apiKeyId: string): Promise<ApiKeysDeleteResult>",
            iam_api,
        )
        self.assertNotIn("async createApiKey(body?: OperationRequest): Promise<PlusApiResult>", iam_api)
        self.assertNotIn("async revoke", iam_api)
        self.assertNotIn("headers?: Record<string, string>", iam_api)

        for token in [
            "AdminApiKeyCreateRequest",
            "AdminApiKeyCreateResponse",
            "ApiKeysCreateResult",
            "ApiKeysDeleteResult",
        ]:
            self.assertIn(f"export type {{ {token} }}", type_exports)

    def test_clawrouter_backend_sdk_does_not_export_appbase_owned_admin_user_operations(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {operation["key"]: operation for operation in manifest["operations"]}
        source = "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-user/src/userService.ts"
        generated_openapi = __import__("json").loads(
            (
                ROOT
                / "generated"
                / "openapi"
                / "clawrouter-backend-openapi.json"
            ).read_text(encoding="utf-8")
        )
        sdk_openapi = __import__("json").loads(
            (
                ROOT
                / "sdks"
                / "clawrouter-backend-sdk"
                / "openapi"
                / "clawrouter-backend-sdk.openapi.json"
            ).read_text(encoding="utf-8")
        )
        sdkgen_openapi = __import__("json").loads(
            (
                ROOT
                / "sdks"
                / "clawrouter-backend-sdk"
                / "openapi"
                / "clawrouter-backend-sdk.sdkgen.json"
            ).read_text(encoding="utf-8")
        )
        iam_api = (
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-typescript"
            / "generated"
            / "server-openapi"
            / "src"
            / "api"
            / "iam.ts"
        ).read_text(encoding="utf-8")
        type_exports = (
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-typescript"
            / "generated"
            / "server-openapi"
            / "src"
            / "types"
            / "index.ts"
        ).read_text(encoding="utf-8")

        add_user = operations[f"{source}#addUser"]
        update_user = operations[f"{source}#updateUser"]
        self.assertEqual("/backend/v3/api/iam/users", add_user["api_path"])
        self.assertEqual("POST", add_user["api_method"])
        self.assertFalse(add_user["openapi_exposed"])
        self.assertEqual("/backend/v3/api/iam/users/{userId}", update_user["api_path"])
        self.assertEqual("PATCH", update_user["api_method"])
        self.assertEqual(["userId"], update_user["path_params"])
        self.assertFalse(update_user["openapi_exposed"])

        for document_name, document in [
            ("generated backend OpenAPI", generated_openapi),
            ("backend SDK authority OpenAPI", sdk_openapi),
            ("backend SDK sdkgen input", sdkgen_openapi),
        ]:
            with self.subTest(document=document_name):
                self.assertNotIn("/backend/v3/api/user", document["paths"])
                self.assertNotIn("AdminUserCreateRequest", document["components"]["schemas"])
                self.assertNotIn("AdminUserUpdateRequest", document["components"]["schemas"])
                serialized = __import__("json").dumps(document, sort_keys=True)
                self.assertNotIn('"operationId": "users.update"', serialized)
                self.assertNotIn('"operationId": "users.create"', serialized)

        self.assertNotIn("AdminUserCreateRequest", iam_api)
        self.assertNotIn("AdminUserUpdateRequest", iam_api)
        self.assertNotIn("UsersUpdateResult", iam_api)
        self.assertNotIn("users.update", iam_api)
        self.assertNotIn("async update(", iam_api)
        self.assertNotIn("export type { AdminUserCreateRequest }", type_exports)
        self.assertNotIn("export type { AdminUserUpdateRequest }", type_exports)
        self.assertNotIn("export type { UsersUpdateResult }", type_exports)

    def test_admin_user_create_forms_use_dedicated_inputs_without_clock_defaults(self) -> None:
        package_root = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-user"
        )
        package = __import__("json").loads((package_root / "package.json").read_text(encoding="utf-8"))
        service = (package_root / "src" / "userService.ts").read_text(encoding="utf-8")
        view = (package_root / "src" / "index.tsx").read_text(encoding="utf-8")
        form = (package_root / "src" / "userForm.ts").read_text(encoding="utf-8")
        verifier = (ROOT / "scripts" / "verify-claw-router-application.mjs").read_text(encoding="utf-8")

        self.assertEqual(package["type"], "module")
        self.assertEqual(package["scripts"]["typecheck"], "tsc --noEmit")
        self.assertIn("export type UserCreateInput", service)
        self.assertIn("export type UserUpdateInput", service)
        self.assertIn("export type ApiKeyCreateInput", service)
        self.assertIn("static async addUser(user: UserCreateInput): Promise<UserListItem>", service)
        self.assertIn("static async updateUser(id: string, updates: UserUpdateInput): Promise<UserListItem>", service)
        self.assertIn("readRequiredApiItem(result, 'admin.user.errors.updateUserMissingData')", service)
        self.assertIn("static async createApiKey(input: ApiKeyCreateInput): Promise<{ key: ApiKeyItem; rawKey: string }>", service)
        self.assertIn("function toCreateUserRequest(user: UserCreateInput)", service)
        self.assertIn("function toUpdateUserRequest(updates: UserUpdateInput)", service)
        self.assertIn("function toCreateApiKeyRequest(input: ApiKeyCreateInput)", service)
        self.assertIn("readRequiredPositiveInt64String(item, 'id', 'User id is required')", service)
        self.assertIn("requiredPositiveInt64String(input.userId, 'userId')", service)
        self.assertIn("apiKeysMap: Record<string, ApiKeyItem[]>", service)
        self.assertNotIn("Record<number, ApiKeyItem[]>", service)
        self.assertNotIn("readRequiredNumber(item, 'id'", service)
        self.assertNotIn("function positiveId(value: number", service)
        self.assertIn("createUserInputFromForm", view)
        self.assertIn("createApiKeyInputFromForm", view)
        self.assertIn("UserService.addUser(createUserInputFromForm(formData))", view)
        self.assertIn("UserService.createApiKey(createApiKeyInputFromForm(formData, apiKeysTarget.id))", view)
        self.assertNotIn("Partial<UserListItem>", service)
        self.assertNotIn("new Date()", view)
        self.assertNotIn("Date.now()", view)
        self.assertNotIn("const newUserParams", view)
        self.assertIn("export function createUserInputFromForm", form)
        self.assertIn("export function createApiKeyInputFromForm", form)
        self.assertNotIn("new Date()", form)
        self.assertNotIn("Date.now()", form)
        self.assertIn("admin-user-runtime.test.ts", verifier)

    def test_admin_user_mutation_forms_are_pure_command_builders(self) -> None:
        package_root = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-user"
        )
        service = (package_root / "src" / "userService.ts").read_text(encoding="utf-8")
        view = (package_root / "src" / "index.tsx").read_text(encoding="utf-8")
        form = (package_root / "src" / "userForm.ts").read_text(encoding="utf-8")
        runtime_test = (
            ROOT / "apps" / "sdkwork-clawrouter-pc" / "admin-user-runtime.test.ts"
        ).read_text(encoding="utf-8")

        self.assertNotIn("export type UserBalanceAdjustmentInput", service)
        self.assertNotIn("static async updateBalance", service)
        self.assertNotIn("toBalanceAdjustmentRequest", service)

        for token in [
            "export function createUserProfileUpdateInputFromForm",
            "export function createUserGroupUpdateInputFromForm",
            "export function createUserStatusUpdateInput",
        ]:
            self.assertIn(token, form)
            self.assertIn(token.replace("export function ", ""), runtime_test)
        self.assertNotIn("createUserBalanceAdjustmentInputFromForm", form)
        self.assertNotIn("UserBalanceAdjustmentInput", form)

        self.assertIn("UserService.updateUser(editTarget.id, createUserProfileUpdateInputFromForm(formData))", view)
        self.assertIn("UserService.updateUser(groupsTarget.id, createUserGroupUpdateInputFromForm(formData))", view)
        self.assertIn("UserService.updateUser(target.id, createUserStatusUpdateInput(nextStatus))", view)

        self.assertNotIn("const amountStr = formData.get('amount') as string", view)
        self.assertNotIn("parseFloat(amountStr)", view)
        self.assertNotIn("createUserBalanceAdjustmentInputFromForm", view)
        self.assertNotIn("UserService.updateBalance(rechargeTarget.id, amount, 'recharge')", view)
        self.assertNotIn("UserService.updateBalance(refundTarget.id, amount, 'refund')", view)
        self.assertNotIn("const username = formData.get('username')", view)
        self.assertNotIn("UserService.updateUser(editTarget.id, { username })", view)
        self.assertNotIn("const newGroup = formData.get('group')", view)
        self.assertNotIn("UserService.updateUser(groupsTarget.id, { group: newGroup })", view)

    def test_admin_user_view_uses_typed_runtime_state(self) -> None:
        view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-user"
            / "src"
            / "index.tsx"
        ).read_text(encoding="utf-8")

        for token in [
            ".filter((key) => key.id !== keyId)",
            ".map((key) => (",
            "setUsers((currentUsers) =>",
            "setApiKeysMap((currentApiKeysMap) =>",
        ]:
            self.assertIn(token, view)

        self.assertNotIn(": any", view)
        self.assertNotIn("as any", view)
        self.assertNotIn(".filter((k: any)", view)
        self.assertNotIn(".map((key: any)", view)

    def test_admin_user_balance_read_model_rejects_invalid_database_amounts(self) -> None:
        store_paths = [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_user_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_user_store.rs",
        ]

        for relative_path in store_paths:
            store = (ROOT / relative_path).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative_path):
                self.assertIn("balance: balance_label(&balance)?", compact_store)
                self.assertIn("fn balance_label(value: &str) -> DomainResult<String>", compact_store)
                self.assertIn("invalid admin user balance", store)
                self.assertNotIn('unwrap_or_else(|_| "$0.00".to_owned())', store)

    def test_admin_user_and_api_key_statuses_fail_closed(self) -> None:
        store_paths = [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_user_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_user_store.rs",
        ]

        for relative_path in store_paths:
            store = (ROOT / relative_path).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative_path):
                self.assertIn("CASE LOWER(COALESCE(u.status, ''))", store)
                self.assertIn("WHEN 'active' THEN 1", store)
                self.assertIn("END AS user_status", store)
                self.assertIn("status AS status", store)
                self.assertIn(
                    "AND LOWER(COALESCE(u.status, '')) IN ('active', 'banned', 'disabled', 'inactive')",
                    store,
                )
                self.assertIn(
                    "AND LOWER(COALESCE(status, '')) IN ('active', 'banned', 'disabled', 'inactive')",
                    store,
                )
                self.assertIn("AND status = 1", store)
                self.assertIn(
                    'status: user_status_label(required_integer_cell(&row, "user_status", "user")?)?',
                    compact_store,
                )
                self.assertIn(
                    'status: api_key_status_label(required_integer_cell(&row, "status", "api key")?)?',
                    compact_store,
                )
                self.assertIn("missing admin user user status from database row", store)
                self.assertIn("missing admin user api key status from database row", store)
                self.assertIn("invalid admin user status from database row", store)
                self.assertIn("invalid admin api key status from database row", store)

                for forbidden in [
                    "COALESCE(u.status, 1) AS user_status",
                    "COALESCE(status, 1) AS status",
                    "AND COALESCE(u.status, 1) IN (0, 1)",
                    "AND COALESCE(status, 1) = 1",
                    "AND COALESCE(status, 1) IN (0, 1)",
                    "u.status AS user_status",
                    "AND u.status IN (0, 1)",
                    "AND status IN (0, 1)",
                    "match status.unwrap_or(i64::from(USER_STATUS_ACTIVE))",
                    "match status.unwrap_or(i64::from(API_KEY_STATUS_ACTIVE))",
                    'user_status_label(optional_integer_cell(&row, "user_status"))',
                    'api_key_status_label(optional_integer_cell(&row, "status"))',
                ]:
                    self.assertNotIn(forbidden, store)


if __name__ == "__main__":
    unittest.main()
