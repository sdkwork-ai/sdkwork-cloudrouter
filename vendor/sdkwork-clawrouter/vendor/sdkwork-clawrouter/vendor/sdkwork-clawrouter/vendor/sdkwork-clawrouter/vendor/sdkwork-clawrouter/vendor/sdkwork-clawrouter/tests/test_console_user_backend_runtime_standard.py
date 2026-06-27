import unittest
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


class ConsoleUserBackendRuntimeStandardTest(unittest.TestCase):
    def test_console_user_current_profile_is_federated_iam_not_product_local(self) -> None:
        product_api_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "mod.rs"
        ).read_text(encoding="utf-8")
        routes = (
            ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs"
        ).read_text(encoding="utf-8")
        iam_runtime = (
            ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "iam_runtime.rs"
        ).read_text(encoding="utf-8")

        self.assertNotIn("mod app_user_profile;", product_api_mod)
        self.assertNotIn("app_user_profile_router", product_api_mod)
        self.assertNotIn("app_user_profile_router_with_read_store", product_api_mod)
        self.assertNotIn("app_user_profile_router", routes)
        self.assertNotIn("AppUserProfileReadStore", routes)
        self.assertIn("merge_federated_iam_routers", routes)
        self.assertIn("wire_iam_routers", iam_runtime)
        self.assertIn("bootstrap_iam_database_from_env", iam_runtime)

    def test_console_user_contract_response_schema_is_precise(self) -> None:
        contract_text = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")
        contract = yaml.safe_load(contract_text)
        operation = next(
            (
                item
                for item in contract["frontend_operations"]
                if item.get("operation_id") == "users.current.retrieve"
            ),
            None,
        )

        self.assertIsNotNone(operation)
        self.assertEqual("/app/v3/api/iam/users/current", operation["api_path"])
        self.assertEqual("IamUserResponse", operation["response_schema"]["name"])
        self.assertEqual("object", operation["response_schema"]["type"])
        self.assertFalse(operation["response_schema"]["additionalProperties"])
        response_schema = operation["response_schema"]
        self.assertEqual(
            [
                "id",
                "username",
                "displayName",
                "email",
                "avatar",
                "phone",
                "language",
                "isVerified",
                "status",
                "registeredAt",
                "lastLogin",
                "lastLoginIp",
                "passwordLastChanged",
                "twoFactorEnabled",
                "thirdPartyBound",
            ],
            response_schema["required"],
        )

        properties = response_schema["properties"]
        self.assertEqual(
            {"type": "string", "minLength": 1, "maxLength": 128},
            properties["displayName"],
        )
        self.assertEqual({"type": "string", "maxLength": 256}, properties["email"])
        self.assertEqual({"$ref": "#/components/schemas/MediaResource"}, properties["avatar"])
        self.assertEqual(
            "Safe display phone value, empty when unavailable.",
            properties["phone"]["description"],
        )
        self.assertEqual(
            "Masked client IP address from the latest login event.",
            properties["lastLoginIp"]["description"],
        )
        self.assertEqual(
            "Safe OAuth provider binding summary without provider subject IDs or tokens.",
            properties["thirdPartyBound"]["description"],
        )

    def test_console_user_generated_sdk_and_frontend_use_precise_user_profile_type(self) -> None:
        package_root = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-user"
        )
        package = __import__("json").loads((package_root / "package.json").read_text(encoding="utf-8"))
        openapi = (
            ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json"
        ).read_text(encoding="utf-8")
        frontend = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-user"
            / "src"
            / "userService.ts"
        ).read_text(encoding="utf-8")

        self.assertEqual(package["type"], "module")
        self.assertEqual(package["scripts"]["typecheck"], "tsc --noEmit")
        self.assertTrue((package_root / "tsconfig.json").exists())
        self.assertIn('"IamUserResponse"', openapi)
        self.assertIn('"$ref": "#/components/schemas/IamUserResponse"', openapi)

        self.assertIn("getSdkworkAppbaseAppSdkClient().iam.users.current.retrieve()", frontend)
        self.assertIn("export interface UserProfile", frontend)
        self.assertIn("name: SdkUserProfileResponse['displayName'];", frontend)
        self.assertIn("avatar: SdkUserProfileResponse['avatar'];", frontend)
        self.assertIn("isVerified: SdkUserProfileResponse['isVerified'];", frontend)
        self.assertIn("thirdPartyBound: SdkUserProfileResponse['thirdPartyBound'];", frontend)
        self.assertIn("Promise<UserProfile>", frontend)
        self.assertIn("normalizeUserProfile", frontend)
        self.assertIn("readRequiredString(data, 'email', 'User profile response missing data')", frontend)
        self.assertNotIn("getClawRouterAppSdkClient().user.fetchUserProfile()", frontend)
        self.assertNotIn("as unknown as UserProfile", frontend)
        self.assertNotIn("initialAvatar", frontend)

    def test_console_user_hides_unsupported_profile_and_security_actions_until_contract_exists(
        self,
    ) -> None:
        user_view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-user"
            / "src"
            / "UserView.tsx"
        ).read_text(encoding="utf-8")
        user_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-user"
            / "src"
            / "userService.ts"
        ).read_text(encoding="utf-8")
        contract = (
            ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml"
        ).read_text(encoding="utf-8")

        self.assertNotIn("readOnlyUserActions", user_view)
        self.assertNotIn("Read-only", user_view)
        self.assertNotIn("read-only", user_view)
        self.assertNotIn("command contract", user_view)
        self.assertIn("UserService.fetchCurrentUser()", user_view)
        self.assertIn("getSdkworkAppbaseAppSdkClient().iam.users.current.retrieve()", user_service)
        self.assertIn("operation: fetchCurrentUser", contract)
        self.assertIn("operation_id: users.current.retrieve", contract)
        self.assertNotIn("updateUserProfile", contract)
        self.assertNotIn("uploadAvatar", contract)
        self.assertNotIn("changePassword", contract)
        self.assertNotIn("manageTwoFactor", contract)
        self.assertNotIn("manageThirdPartyConnections", contract)

        unsupported_action_codepoints = [
            (0x7F02, 0x682C, 0x7DEB),
            (0x6DC7, 0xE1BD, 0x657C, 0x7035, 0x55D9, 0x721C),
            (0x7EE0, 0xFF04, 0x608A),
            (0x7EE0, 0xFF04, 0x608A, 0x6769, 0x70B4, 0x5E34),
        ]
        unsupported_actions = [
            "<button",
            "cursor-pointer",
            "Upload",
            "Edit",
            "Change password",
            "Manage",
            "Manage connections",
            *(
                "".join(chr(codepoint) for codepoint in action)
                for action in unsupported_action_codepoints
            ),
        ]
        for unsupported_action in unsupported_actions:
            self.assertNotIn(unsupported_action, user_view)

        for removed_explanatory_copy in [
            "Profile updates require an explicit generated App SDK contract before they can be enabled.",
            "Password, 2FA, and third-party binding controls are read-only until dedicated security command contracts exist.",
            "Avatar upload is read-only until a signed upload contract exists.",
        ]:
            self.assertNotIn(removed_explanatory_copy, user_view)

    def test_console_user_uses_retryable_business_state_for_remote_profile_loading(
        self,
    ) -> None:
        user_view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-user"
            / "src"
            / "UserView.tsx"
        ).read_text(encoding="utf-8")

        for marker in [
            "BusinessStatePanel",
            "loadUserProfile",
            "loadError",
            "setLoadError",
            "onRetry={() => void loadUserProfile()}",
            "console.user.states.loadErrorTitle",
        ]:
            self.assertIn(marker, user_view)

        self.assertNotIn('<Loader2 className="w-8 h-8', user_view)

    def test_console_user_product_states_are_localized(self) -> None:
        user_view = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-user"
            / "src"
            / "UserView.tsx"
        ).read_text(encoding="utf-8")
        user_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-console-user"
            / "src"
            / "userService.ts"
        ).read_text(encoding="utf-8")
        i18n = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-i18n"
            / "src"
            / "resources"
            / "console"
            / "account.ts"
        ).read_text(encoding="utf-8")

        for marker in [
            "console.user.states.loading",
            "console.user.states.loadErrorTitle",
            "console.user.states.loadErrorFallback",
            "console.user.states.emptyTitle",
            "console.user.states.emptyDescription",
        ]:
            self.assertIn(marker, user_view + user_service + i18n)
            self.assertGreaterEqual(i18n.count(f'"{marker}"'), 2)

        for hardcoded_copy in [
            "Loading user profile...",
            "User profile could not be loaded",
            "Failed to load user profile.",
            "No user profile found",
            "The user profile API returned no profile data for the active session.",
            "Failed to fetch current user",
        ]:
            self.assertNotIn(hardcoded_copy, user_view)
            self.assertNotIn(hardcoded_copy, user_service)


if __name__ == "__main__":
    unittest.main()
