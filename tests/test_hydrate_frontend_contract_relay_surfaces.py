import unittest

from tools.hydrate_frontend_contract_relay_surfaces import (
    _expand_route_tables,
    _merge_contract_operations,
)


AUTH_CONTROLLER_SOURCE = (
    "apps/sdkwork-clawrouter-pc/src/auth/clawRouterAuthController.ts"
)
MESSAGING_TABLES = {
    "messaging_verification_policy",
    "messaging_verification_challenge",
    "messaging_verification_attempt",
    "messaging_outbound_message",
    "messaging_outbound_delivery",
}


class HydrateFrontendContractRelaySurfacesTest(unittest.TestCase):
    def test_auth_routes_retain_messaging_tables_idempotently(self) -> None:
        once = _expand_route_tables(
            [{"route": "/auth/login", "required_tables": ["iam_user"]}]
        )
        twice = _expand_route_tables(once)

        self.assertEqual(once, twice)
        by_route = {entry["route"]: entry for entry in once}
        for route in ("/auth/login", "/auth/register", "/auth/forgot-password"):
            with self.subTest(route=route):
                self.assertTrue(
                    MESSAGING_TABLES <= set(by_route[route]["required_tables"])
                )

    def test_hydration_preserves_authored_messaging_verification_contracts(self) -> None:
        for operation, path, operation_id in (
            (
                "sendVerifyCode",
                "/app/v3/api/messaging/verification_codes",
                "messaging.verificationCodes.create",
            ),
            (
                "verifyCode",
                "/app/v3/api/messaging/verification_codes/verify",
                "messaging.verificationCodes.verify",
            ),
        ):
            with self.subTest(operation=operation):
                authored = {
                    "route": "/auth/login",
                    "source": AUTH_CONTROLLER_SOURCE,
                    "operation": operation,
                    "operation_id": operation_id,
                    "api_surface": "app",
                    "api_method": "POST",
                    "api_path": path,
                    "description": f"Authored {operation} contract.",
                    "response_schema": {
                        "name": "MessagingVerificationResponse",
                        "type": "object",
                    },
                    "request_schema": {
                        "name": "MessagingVerificationRequest",
                        "type": "object",
                    },
                    "request_body_required": True,
                    "idempotency_required": True,
                }
                audited = {
                    "route": "/auth/login",
                    "source": AUTH_CONTROLLER_SOURCE,
                    "operation": operation,
                    "operation_id": "derived.operation.id",
                    "api_surface": "app",
                    "api_method": "POST",
                    "api_path": path,
                    "response_schema": {"name": "NoData", "properties": {}},
                    "request_body_required": False,
                }

                merged = _merge_contract_operations([audited], [authored])
                result = next(
                    entry for entry in merged if entry.get("operation") == operation
                )

                for field in (
                    "operation_id",
                    "description",
                    "response_schema",
                    "request_schema",
                    "request_body_required",
                    "idempotency_required",
                ):
                    self.assertEqual(authored[field], result[field])

    def test_hydration_does_not_invent_missing_operation_contracts(self) -> None:
        audited = {
            "route": "/admin/example",
            "source": "apps/exampleService.ts",
            "operation": "fetchExamples",
            "operation_id": "examples.list",
            "api_surface": "backend",
            "api_method": "GET",
            "api_path": "/backend/v3/api/examples",
            "response_schema": {"name": "NoData", "properties": {}},
        }

        self.assertEqual([], _merge_contract_operations([audited], []))

    def test_hydration_preserves_route_manifest_authority_operations(self) -> None:
        authority = {
            "route": "/admin/example",
            "source": "tools/bootstrap_frontend_contract_from_route_manifest.py",
            "operation": "list",
            "operation_id": "examples.list",
            "api_surface": "backend",
            "api_method": "GET",
            "api_path": "/backend/v3/api/examples",
            "response_schema": {
                "name": "ExampleListResponse",
                "type": "object",
            },
        }

        self.assertEqual(
            [authority],
            _merge_contract_operations([], [authority]),
        )


if __name__ == "__main__":
    unittest.main()
