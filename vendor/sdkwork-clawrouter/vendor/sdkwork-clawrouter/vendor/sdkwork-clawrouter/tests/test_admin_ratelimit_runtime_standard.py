import json
import unittest
from pathlib import Path

from tools.api_contract_manifest import ApiContractManifestGenerator


ROOT = Path(__file__).resolve().parents[1]


class AdminRateLimitRuntimeStandardTest(unittest.TestCase):
    def test_admin_ratelimit_write_contracts_use_operation_specific_payloads(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {operation["key"]: operation for operation in manifest["operations"]}
        source = "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-ratelimit/src/ratelimitService.ts"

        add_ip_limit = operations[f"{source}#addIpLimit"]
        add_token_limit = operations[f"{source}#addTokenLimit"]
        add_model_limit = operations[f"{source}#addModelLimit"]
        add_firewall = operations[f"{source}#addFirewall"]

        self.assertEqual("AdminIpLimitCreateRequest", add_ip_limit["request_schema"]["name"])
        self.assertEqual(
            ["ruleName", "targetIp", "rps", "rpm", "blockDuration"],
            add_ip_limit["request_schema"]["schema"]["required"],
        )
        self.assertEqual("AdminRateLimitMutationResponse", add_ip_limit["response_schema"]["name"])
        self.assertFalse(add_ip_limit["request_id_header"])

        self.assertEqual("AdminTokenLimitCreateRequest", add_token_limit["request_schema"]["name"])
        self.assertEqual(
            ["keyPrefix", "user", "rps", "rpd", "burst"],
            add_token_limit["request_schema"]["schema"]["required"],
        )
        self.assertEqual("AdminRateLimitMutationResponse", add_token_limit["response_schema"]["name"])
        self.assertFalse(add_token_limit["request_id_header"])

        self.assertEqual("AdminModelLimitCreateRequest", add_model_limit["request_schema"]["name"])
        self.assertEqual(
            ["model", "channelGroup", "rpm", "tpm"],
            add_model_limit["request_schema"]["schema"]["required"],
        )
        self.assertEqual("AdminRateLimitMutationResponse", add_model_limit["response_schema"]["name"])
        self.assertFalse(add_model_limit["request_id_header"])
        self.assertEqual("/backend/v3/api/system/rate_limits/models", add_model_limit["api_path"])

        self.assertEqual("AdminFirewallRuleCreateRequest", add_firewall["request_schema"]["name"])
        self.assertEqual(["type", "value", "reason"], add_firewall["request_schema"]["schema"]["required"])
        self.assertEqual("AdminFirewallMutationResponse", add_firewall["response_schema"]["name"])
        self.assertFalse(add_firewall["request_id_header"])

    def test_admin_ratelimit_frontend_and_backend_sdk_do_not_use_generic_write_payloads(self) -> None:
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-ratelimit"
            / "src"
            / "ratelimitService.ts"
        ).read_text(encoding="utf-8")
        system_api = (ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "system.ts").read_text(
            encoding="utf-8"
        )
        type_exports = (
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "index.ts"
        ).read_text(encoding="utf-8")

        for token in [
            "AdminIpLimitCreateRequest",
            "AdminTokenLimitCreateRequest",
            "AdminModelLimitCreateRequest",
            "AdminFirewallRuleCreateRequest",
            "toCreateIpLimitRequest",
            "toCreateTokenLimitRequest",
            "toCreateModelLimitRequest",
            "toCreateFirewallRequest",
        ]:
            self.assertIn(token, service)
        for token in [
            "createIdempotencyParams('admin-ip-limit-create')",
            "createIdempotencyParams('admin-token-limit-create')",
            "createIdempotencyParams('admin-model-limit-create')",
            "createIdempotencyParams('admin-firewall-create')",
        ]:
            self.assertNotIn(token, service)

        self.assertNotIn("router.addIpLimit(rule)", service)
        self.assertNotIn("router.addTokenLimit(rule)", service)
        self.assertNotIn("router.addModelLimit(rule)", service)
        self.assertNotIn("router.addFirewall(rule)", service)
        self.assertNotIn("as unknown as Record<string, unknown>", service)
        self.assertNotIn("group: string;", service)
        self.assertNotIn("readModelLimitGroup", service)
        self.assertNotIn("group: requiredText(rule.channelGroup, 'channelGroup')", service)

        self.assertIn(
            "async create(body: AdminIpLimitCreateRequest): Promise<RateLimitsIpCreateResult>",
            system_api,
        )
        self.assertIn(
            "async create(body: AdminTokenLimitCreateRequest): Promise<RateLimitsApiKeysCreateResult>",
            system_api,
        )
        self.assertIn(
            "async create(body: AdminModelLimitCreateRequest): Promise<RateLimitsModelsCreateResult>",
            system_api,
        )
        self.assertIn(
            "async create(body: AdminFirewallRuleCreateRequest): Promise<FirewallsRulesCreateResult>",
            system_api,
        )
        self.assertNotIn("async addIpLimit(body?: OperationRequest): Promise<PlusApiResult>", system_api)
        self.assertNotIn("async addTokenLimit(body?: OperationRequest): Promise<PlusApiResult>", system_api)
        self.assertNotIn("async addModelLimit(body?: OperationRequest): Promise<PlusApiResult>", system_api)
        self.assertNotIn("async addFirewall(body?: OperationRequest): Promise<PlusApiResult>", system_api)
        self.assertNotIn("headers?: Record<string, string>", system_api)

        for token in [
            "AdminIpLimitCreateRequest",
            "AdminTokenLimitCreateRequest",
            "AdminModelLimitCreateRequest",
            "AdminFirewallRuleCreateRequest",
            "AdminRateLimitMutationResponse",
            "AdminFirewallMutationResponse",
            "RateLimitsIpCreateResult",
            "RateLimitsApiKeysCreateResult",
            "RateLimitsModelsCreateResult",
            "FirewallsRulesCreateResult",
        ]:
            self.assertIn(f"export type {{ {token} }}", type_exports)

    def test_admin_ratelimit_create_forms_use_dedicated_inputs(self) -> None:
        package_root = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-ratelimit"
        )
        package = json.loads((package_root / "package.json").read_text(encoding="utf-8"))
        service = (package_root / "src" / "ratelimitService.ts").read_text(encoding="utf-8")
        view = (package_root / "src" / "index.tsx").read_text(encoding="utf-8")
        form = (package_root / "src" / "ratelimitForm.ts").read_text(encoding="utf-8")
        verifier = (ROOT / "scripts" / "verify-claw-router-application.mjs").read_text(encoding="utf-8")

        self.assertEqual(package["type"], "module")
        self.assertEqual(package["scripts"]["typecheck"], "tsc --noEmit")
        self.assertIn("export type IpLimitCreateInput", service)
        self.assertIn("export type TokenLimitCreateInput", service)
        self.assertIn("export type ModelLimitCreateInput", service)
        self.assertIn("export type FirewallCreateInput", service)
        self.assertIn("static async addIpLimit(rule: IpLimitCreateInput): Promise<IpLimitRule>", service)
        self.assertIn("static async addTokenLimit(rule: TokenLimitCreateInput): Promise<TokenLimitRule>", service)
        self.assertIn("static async addModelLimit(rule: ModelLimitCreateInput): Promise<ModelLimitRule>", service)
        self.assertIn("static async addFirewall(rule: FirewallCreateInput): Promise<FirewallRule>", service)
        self.assertIn("function toCreateIpLimitRequest(rule: IpLimitCreateInput)", service)
        self.assertIn("function toCreateTokenLimitRequest(rule: TokenLimitCreateInput)", service)
        self.assertIn("function toCreateModelLimitRequest(rule: ModelLimitCreateInput)", service)
        self.assertIn("function toCreateFirewallRequest(rule: FirewallCreateInput)", service)
        self.assertIn("channelGroup: requiredText(rule.channelGroup, 'channelGroup')", service)
        self.assertIn("createIpLimitInputFromForm", view)
        self.assertIn("createTokenLimitInputFromForm", view)
        self.assertIn("createModelLimitInputFromForm", view)
        self.assertIn("createFirewallInputFromForm", view)
        self.assertIn("RateLimitService.addIpLimit(createIpLimitInputFromForm(formData))", view)
        self.assertIn("RateLimitService.addTokenLimit(createTokenLimitInputFromForm(formData))", view)
        self.assertIn("RateLimitService.addModelLimit(createModelLimitInputFromForm(formData))", view)
        self.assertIn("RateLimitService.addFirewall(createFirewallInputFromForm(formData))", view)
        self.assertNotIn("Omit<IpLimitRule", service)
        self.assertNotIn("Omit<TokenLimitRule", service)
        self.assertNotIn("Omit<ModelLimitRule", service)
        self.assertNotIn("Omit<FirewallRule", service)
        self.assertNotIn("Date.now()", view)
        self.assertNotIn("Math.random()", view)
        self.assertIn("export function createIpLimitInputFromForm", form)
        self.assertIn("export function createTokenLimitInputFromForm", form)
        self.assertIn("export function createModelLimitInputFromForm", form)
        self.assertIn("export function createFirewallInputFromForm", form)
        self.assertNotIn("Date.now()", form)
        self.assertNotIn("Math.random()", form)
        self.assertIn("admin-ratelimit-runtime.test.ts", verifier)

    def test_admin_model_limit_public_model_uses_channel_group_only(self) -> None:
        model_contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "models" / "admin-ratelimit.yaml"
        ).read_text(encoding="utf-8")
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-ratelimit"
            / "src"
            / "ratelimitService.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("- channelGroup", model_contract)
        self.assertIn("- channelGroupId", model_contract)
        self.assertIn("- channelGroupName", model_contract)
        self.assertNotIn("- group\n", model_contract)
        self.assertIn("channelGroup: string;", service)
        self.assertIn("channelGroupId?: string;", service)
        self.assertIn("channelGroupName?: string;", service)
        self.assertIn(
            "channelGroup: readRequiredString(item, 'channelGroup', 'Model limit channel group is required')",
            service,
        )
        self.assertNotIn("group: string;", service)
        self.assertNotIn("const group = readModelLimitGroup(item);", service)
        self.assertNotIn("readRequiredString(item, 'group', 'Model limit group is required')", service)

    def test_admin_ratelimit_read_models_reject_missing_required_policy_numbers(self) -> None:
        store_paths = [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_api_key_rate_limit_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_api_key_rate_limit_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_ip_rate_limit_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_ip_rate_limit_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_model_rate_limit_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_model_rate_limit_store.rs",
        ]

        forbidden_fragments = [
            "COALESCE(q.requests_per_second, 0)",
            "COALESCE(q.requests_per_day, 0)",
            "COALESCE(q.burst_limit, 0)",
            "COALESCE(q.burst_limit, '0')",
            "COALESCE(requests_per_second, 0)",
            "COALESCE(requests_per_minute, 0)",
            "COALESCE(block_duration_seconds, 0)",
            "COALESCE(q.group_id, 0)",
            "COALESCE(q.requests_per_minute, 0)",
            "COALESCE(q.tokens_per_minute, 0)",
            "optional_integer_cell(row, column).unwrap_or(0)",
            ".unwrap_or(0)",
        ]

        for relative_path in store_paths:
            store = (ROOT / relative_path).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative_path):
                for fragment in forbidden_fragments:
                    self.assertNotIn(fragment, store)
                self.assertIn("fn required_integer_cell", store)
                self.assertIn("missing rate limit {column} from database row", store)
                self.assertIn('required_integer_cell(&row, "status")?', compact_store)
                self.assertNotIn("status_label(optional_integer_cell(&row, \"status\")", compact_store)

        for relative_path in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_api_key_rate_limit_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_api_key_rate_limit_store.rs",
        ]:
            store = (ROOT / relative_path).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative_path, column="burst"):
                self.assertIn('burst: required_decimal_integer_cell(&row, "burst")?', compact_store)
                self.assertIn("invalid rate limit {column} from database row", store)


if __name__ == "__main__":
    unittest.main()
