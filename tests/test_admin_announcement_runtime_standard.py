import unittest
import json
from pathlib import Path

from tools.api_contract_manifest import ApiContractManifestGenerator


ROOT = Path(__file__).resolve().parents[1]
ANNOUNCEMENT_PACKAGE = (
    ROOT
    / "apps"
    / "sdkwork-clawrouter-pc"
    / "packages"
    / "sdkwork-clawrouter-pc-admin-announcement"
)


@unittest.skipUnless(
    (ANNOUNCEMENT_PACKAGE / "src" / "announcementService.ts").exists(),
    "admin announcement package removed from claw router PC surface",
)
class AdminAnnouncementRuntimeStandardTest(unittest.TestCase):
    def test_admin_announcement_write_contracts_use_operation_specific_payloads(self) -> None:
        manifest = ApiContractManifestGenerator(root=ROOT).generate()
        operations = {operation["key"]: operation for operation in manifest["operations"]}
        source = (
            "apps/sdkwork-clawrouter-pc/packages/"
            "sdkwork-clawrouter-pc-admin-announcement/src/announcementService.ts"
        )

        add_announcement = operations[f"{source}#addAnnouncement"]
        update_announcement = operations[f"{source}#updateAnnouncement"]

        self.assertEqual("AdminAnnouncementCreateRequest", add_announcement["request_schema"]["name"])
        self.assertEqual(
            ["title", "target", "status", "showAsPopup", "content"],
            add_announcement["request_schema"]["schema"]["required"],
        )
        self.assertEqual("AdminAnnouncementMutationResponse", add_announcement["response_schema"]["name"])
        self.assertFalse(add_announcement["request_id_header"])

        self.assertEqual("AdminAnnouncementUpdateRequest", update_announcement["request_schema"]["name"])
        self.assertNotIn("required", update_announcement["request_schema"]["schema"])
        self.assertEqual("AdminAnnouncementMutationResponse", update_announcement["response_schema"]["name"])
        self.assertFalse(update_announcement["request_id_header"])

    def test_admin_announcement_frontend_and_backend_sdk_do_not_use_generic_write_payloads(self) -> None:
        service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-announcement"
            / "src"
            / "announcementService.ts"
        ).read_text(encoding="utf-8")
        router_api = (
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "content.ts"
        ).read_text(encoding="utf-8")
        type_exports = (
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "index.ts"
        ).read_text(encoding="utf-8")

        for token in [
            "AdminAnnouncementCreateRequest",
            "AdminAnnouncementUpdateRequest",
            "toCreateAnnouncementRequest",
            "toUpdateAnnouncementRequest",
        ]:
            self.assertIn(token, service)
        self.assertNotIn("createIdempotencyParams('admin-announcement-create')", service)
        self.assertNotIn("createIdempotencyParams('admin-announcement-update')", service)

        self.assertNotIn("router.updateAnnouncement(id, updates)", service)
        self.assertNotIn("router.addAnnouncement(ann)", service)
        self.assertNotIn("as unknown as Record<string, unknown>", service)

        self.assertIn(
            "async create(body: AdminAnnouncementCreateRequest): Promise<AnnouncementsCreateResult>",
            router_api,
        )
        self.assertIn(
            "async update(announcementId: string, body: AdminAnnouncementUpdateRequest): Promise<AnnouncementsUpdateResult>",
            router_api,
        )
        self.assertNotIn("async create(body?: OperationRequest): Promise<PlusApiResult>", router_api)
        self.assertNotIn(
            "async update(announcementId: string | number, body?: OperationRequest): Promise<PlusApiResult>",
            router_api,
        )
        self.assertNotIn("headers?: Record<string, string>", router_api)

        for token in [
            "AdminAnnouncementCreateRequest",
            "AdminAnnouncementUpdateRequest",
            "AdminAnnouncementMutationResponse",
            "AnnouncementsCreateResult",
            "AnnouncementsUpdateResult",
        ]:
            self.assertIn(f"export type {{ {token} }}", type_exports)

    def test_admin_announcement_create_forms_use_dedicated_inputs(self) -> None:
        package_root = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-announcement"
        )
        package = json.loads((package_root / "package.json").read_text(encoding="utf-8"))
        service = (package_root / "src" / "announcementService.ts").read_text(encoding="utf-8")
        view = (package_root / "src" / "index.tsx").read_text(encoding="utf-8")
        form = (package_root / "src" / "announcementForm.ts").read_text(encoding="utf-8")
        verifier = (ROOT / "scripts" / "verify-claw-router-application.mjs").read_text(encoding="utf-8")

        self.assertEqual(package["type"], "module")
        self.assertEqual(package["scripts"]["typecheck"], "tsc --noEmit")
        self.assertIn("export type AnnouncementCreateInput", service)
        self.assertIn("export type AnnouncementUpdateInput", service)
        self.assertIn("static async addAnnouncement(ann: AnnouncementCreateInput): Promise<Announcement>", service)
        self.assertIn(
            "static async updateAnnouncement(id: string, updates: AnnouncementUpdateInput): Promise<Announcement>",
            service,
        )
        self.assertIn("readRequiredApiItem(result, 'Updated announcement response is missing data')", service)
        self.assertIn("function toCreateAnnouncementRequest(ann: AnnouncementCreateInput)", service)
        self.assertIn("function toUpdateAnnouncementRequest(updates: AnnouncementUpdateInput)", service)
        self.assertNotIn("Pick<Announcement", service)
        self.assertNotIn("Partial<Announcement", service)
        self.assertIn("createAnnouncementInputFromForm", view)
        self.assertIn("createAnnouncementUpdateInputFromForm", view)
        self.assertIn("createAnnouncementStatusInput", view)
        self.assertIn("AnnouncementService.addAnnouncement(createAnnouncementInputFromForm", view)
        self.assertIn("AnnouncementService.updateAnnouncement(editingId, createAnnouncementUpdateInputFromForm", view)
        self.assertIn("AnnouncementService.updateAnnouncement(id, createAnnouncementStatusInput(nextStatus))", view)
        self.assertIn("export function createAnnouncementInputFromForm", form)
        self.assertIn("export function createAnnouncementUpdateInputFromForm", form)
        self.assertIn("export function createAnnouncementStatusInput", form)
        self.assertNotIn("createAnnouncementPublishInput", form)
        self.assertNotIn("Date.now()", view)
        self.assertNotIn("Math.random()", view)
        self.assertNotIn("Date.now()", form)
        self.assertNotIn("Math.random()", form)
        self.assertIn("admin-announcement-runtime.test.ts", verifier)

    def test_admin_announcement_read_model_fails_closed_for_target_and_status(self) -> None:
        relative_path = (
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/"
            "postgres/admin_announcement_store.rs"
        )
        store = (ROOT / relative_path).read_text(encoding="utf-8")
        compact_store = " ".join(store.split())

        self.assertIn(
            'target: target_label( required_integer_cell(row, "recipient_type")?, &string_cell(row, "recipient_value"), optional_non_empty_string_cell(row, "recipient_role_code").as_deref(), )?',
            compact_store,
        )
        self.assertIn(
            'status: status_label(required_integer_cell(row, "status")?)?',
            compact_store,
        )
        self.assertIn(
            "fn target_label( recipient_type: i64, recipient_value: &str, recipient_role_code: Option<&str>, ) -> DomainResult<String>",
            compact_store,
        )
        self.assertIn(
            "fn status_label(value: i64) -> DomainResult<String>",
            compact_store,
        )
        self.assertIn("missing admin announcement {column} from database row", store)
        self.assertIn("invalid admin announcement target from database row", store)
        self.assertIn("invalid admin announcement recipient type from database row", store)
        self.assertIn("invalid admin announcement status from database row", store)
        self.assertNotIn('target_label(optional_integer_cell(&row, "target_scope"))', store)
        self.assertNotIn('status_label(optional_integer_cell(&row, "status"))', store)


if __name__ == "__main__":
    unittest.main()
