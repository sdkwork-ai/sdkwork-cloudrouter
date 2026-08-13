mod account;
mod account_group;
mod resource_catalog;
mod shared;
mod supplier;

use axum::Router;
use sdkwork_cloudrouter_router_service::ports::AdminUpstreamModelListEntry;
use sdkwork_utils_rust::SdkWorkResultCode;
use serde::{Deserialize, Serialize};

use self::shared::{
    problem_keyed, required_text, RequestResult, UpstreamResourceStore, UpstreamState,
    UpstreamStore, UpstreamVerifier,
};

pub(crate) fn admin_upstream_router_with_store(
    store: UpstreamStore,
    verifier: UpstreamVerifier,
    resource_store: Option<UpstreamResourceStore>,
) -> Router {
    Router::new()
        .merge(supplier::routes())
        .merge(account::routes())
        .merge(account_group::routes())
        .merge(resource_catalog::routes())
        .with_state(UpstreamState {
            store,
            verifier,
            resource_store,
        })
}

pub(super) const MAX_MODEL_LIST_ENTRIES: usize = 100;
pub(super) const MAX_MODEL_LIST_MODELS: usize = 200;
pub(super) const MAX_MODEL_NAME_LENGTH: usize = 256;
pub(super) const MAX_MODEL_VENDOR_CODE_LENGTH: usize = 64;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ModelListEntryInput {
    vendor_code: String,
    #[serde(default)]
    models: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ModelListEntryResponse {
    vendor_code: String,
    models: Vec<String>,
}

/** 模型黑白名单条目校验：i18nKeyPrefix 区分所属实体（accountGroup / supplier）的验证文案 */
pub(super) fn model_list(
    i18n_key_prefix: &str,
    value: Option<Vec<ModelListEntryInput>>,
) -> RequestResult<Vec<AdminUpstreamModelListEntry>> {
    let Some(entries) = value else {
        return Ok(Vec::new());
    };
    if entries.len() > MAX_MODEL_LIST_ENTRIES {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            &format!("validation.admin.upstream.{i18n_key_prefix}.modelList.maxEntries"),
            serde_json::json!({ "max": MAX_MODEL_LIST_ENTRIES }),
            format!("model list must contain at most {MAX_MODEL_LIST_ENTRIES} entries"),
        ));
    }
    entries
        .into_iter()
        .enumerate()
        .map(|(index, entry)| {
            let vendor_code =
                required_text(entry.vendor_code, "vendorCode", MAX_MODEL_VENDOR_CODE_LENGTH)?;
            if entry.models.len() > MAX_MODEL_LIST_MODELS {
                return Err(problem_keyed(
                    SdkWorkResultCode::InvalidParameter,
                    &format!("validation.admin.upstream.{i18n_key_prefix}.modelList.maxModels"),
                    serde_json::json!({ "max": MAX_MODEL_LIST_MODELS }),
                    format!(
                        "model list entry {index} must contain at most {MAX_MODEL_LIST_MODELS} models"
                    ),
                ));
            }
            let models = entry
                .models
                .into_iter()
                .map(|model| {
                    let model = model.trim().to_owned();
                    if model.is_empty() {
                        return Err(problem_keyed(
                            SdkWorkResultCode::InvalidParameter,
                            &format!(
                                "validation.admin.upstream.{i18n_key_prefix}.modelList.emptyModel"
                            ),
                            serde_json::Value::Null,
                            "model names must not be empty",
                        ));
                    }
                    if model.chars().count() > MAX_MODEL_NAME_LENGTH {
                        return Err(problem_keyed(
                            SdkWorkResultCode::InvalidParameter,
                            &format!(
                                "validation.admin.upstream.{i18n_key_prefix}.modelList.modelTooLong"
                            ),
                            serde_json::json!({ "max": MAX_MODEL_NAME_LENGTH }),
                            format!(
                                "model names must be at most {MAX_MODEL_NAME_LENGTH} characters"
                            ),
                        ));
                    }
                    Ok(model)
                })
                .collect::<RequestResult<Vec<_>>>()?;
            Ok(AdminUpstreamModelListEntry { vendor_code, models })
        })
        .collect()
}
