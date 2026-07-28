import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AdminRecordRuntimeStandardTest(unittest.TestCase):
    def test_admin_record_operation_is_backed_by_real_backend_api_router(self) -> None:
        product_api_mod = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "mod.rs"
        ).read_text(encoding="utf-8")
        backend_sdk = (
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "api" / "system.ts"
        ).read_text(encoding="utf-8")
        record_service = (
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-record"
            / "src"
            / "recordService.ts"
        ).read_text(encoding="utf-8")
        admin_record_api = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "api" / "admin_record.rs"
        ).read_text(encoding="utf-8")

        self.assertIn("mod admin_record;", product_api_mod)
        self.assertIn("admin_record_router_with_store", product_api_mod)
        self.assertIn("/backend/v3/api/system/records", admin_record_api)
        self.assertIn("RequiredAdminSqlScopedSubject", admin_record_api)
        self.assertIn("AdminRecordStore", admin_record_api)
        self.assertIn("class SystemRecordsApi", backend_sdk)
        self.assertIn("backendApiPath(`/system/records`)", backend_sdk)
        self.assertIn("export interface SystemRecordsListParams", backend_sdk)
        self.assertIn("{ name: 'page_size', value: params?.pageSize", backend_sdk)
        self.assertIn(
            "getClawRouterBackendSdkClient().system.records.list(toRecordLogQueryParams(filters))",
            record_service,
        )
        self.assertIn("readRequiredPageTotal(data)", record_service)
        self.assertIn("pageInfo.totalItems", record_service)
        self.assertNotIn("readRequiredNonNegativeNumber(data, 'total'", record_service)

    def test_admin_record_read_models_reject_missing_or_invalid_trace_latency(self) -> None:
        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_record_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_record_store.rs",
        ]:
            store = (ROOT / relative).read_text(encoding="utf-8")
            compact_store = " ".join(store.split())
            with self.subTest(store=relative):
                self.assertNotIn("COALESCE(t.latency_ms, 0) AS latency_ms", store)
                self.assertIn("t.latency_ms AS latency_ms", store)
                self.assertNotIn(
                    'total_time: duration_label(integer_cell(&row, "latency_ms"))',
                    compact_store,
                )
                self.assertIn(
                    'total_time: duration_label(required_latency_cell(&row, "latency_ms")?)',
                    compact_store,
                )
                self.assertIn("missing admin record latency_ms from database row", store)
                self.assertIn("invalid admin record latency_ms from database row", store)

    def test_admin_record_log_modality_preserves_unknown_values(self) -> None:
        modality_source = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "model_modality.rs"
        ).read_text(encoding="utf-8")
        self.assertIn('_ => "unknown"', modality_source)
        self.assertNotIn('_ => "text"', modality_source)
        for relative in [
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_record_store.rs",
            "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_record_store.rs",
        ]:
            store = (ROOT / relative).read_text(encoding="utf-8")
            with self.subTest(store=relative):
                self.assertIn("model_modality::label(value).to_owned()", store)
                self.assertNotIn("_ => \"text\"", store)


if __name__ == "__main__":
    unittest.main()
