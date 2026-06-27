import tempfile
import unittest
from pathlib import Path

from tools.rust_route_overlap_audit import RustRouteOverlapAudit


class RustRouteOverlapAuditTest(unittest.TestCase):
    def test_detects_duplicate_routes_declared_with_local_string_constants(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source_dir = root / "services" / "example" / "src"
            source_dir.mkdir(parents=True)
            (source_dir / "lib.rs").write_text(
                """
                use axum::{Router, routing::post};

                const APP_SESSION_PATH: &str = "/app/v3/api/auth/sessions";

                pub fn first_router() -> Router {
                    Router::new().route(APP_SESSION_PATH, post(first_handler))
                }

                pub fn second_router() -> Router {
                    Router::new().route(APP_SESSION_PATH, post(second_handler))
                }
                """,
                encoding="utf-8",
            )

            result = RustRouteOverlapAudit(root).run()

        self.assertFalse(result.ok)
        self.assertEqual(
            [
                "duplicate Rust Axum method route POST /app/v3/api/auth/sessions: "
                "services/example/src/lib.rs:7, services/example/src/lib.rs:11"
            ],
            result.messages,
        )

    def test_scans_sibling_appbase_crates_layout(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace_root = Path(temp_dir)
            root = workspace_root / "sdkwork-clawrouter"
            appbase_source_dir = (
                workspace_root
                / "sdkwork-appbase"
                / "crates"
                / "sdkwork-routes-iam-app-api"
                / "src"
            )
            appbase_source_dir.mkdir(parents=True)
            (appbase_source_dir / "lib.rs").write_text(
                """
                use axum::{Router, routing::get};

                pub fn first_router() -> Router {
                    Router::new().route("/app/v3/api/iam/current_user", get(first_handler))
                }

                pub fn second_router() -> Router {
                    Router::new().route("/app/v3/api/iam/current_user", get(second_handler))
                }
                """,
                encoding="utf-8",
            )

            result = RustRouteOverlapAudit(root).run()

        self.assertFalse(result.ok)
        self.assertEqual(
            [
                "duplicate Rust Axum method route GET /app/v3/api/iam/current_user: "
                "../sdkwork-iam/crates/sdkwork-routes-iam-app-api/src/lib.rs:5, "
                "../sdkwork-iam/crates/sdkwork-routes-iam-app-api/src/lib.rs:9"
            ],
            result.messages,
        )


if __name__ == "__main__":
    unittest.main()
