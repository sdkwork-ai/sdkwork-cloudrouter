use crate::domain::{DomainError, DomainResult};
use crate::ports::AdminCategorySeedBundle;

const PRODUCT_CATEGORY_SEED_JSON: &str =
    include_str!("../../../../data/categories/product/categories.json");
const AGENT_CATEGORY_SEED_JSON: &str =
    include_str!("../../../../data/categories/agents/categories.json");
const AGENT_SKILL_CATEGORY_SEED_JSON: &str =
    include_str!("../../../../data/categories/agent-skills/categories.json");
const MCP_CATEGORY_SEED_JSON: &str =
    include_str!("../../../../data/categories/mcp/categories.json");

pub fn c_category_type_scope(
    legacy_category_type: i32,
    dataset: &str,
    group_name: Option<&str>,
) -> DomainResult<&'static str> {
    if let Some(group) = group_name {
        if group.contains("agent-skills") {
            return Ok("skill_market");
        }
        if group.contains(":agents") {
            return Ok("agent");
        }
        if group.contains(":mcp") {
            return Ok("mcp");
        }
        if group.contains("prompt") {
            return Ok("prompt");
        }
    }
    match legacy_category_type {
        19 => Ok("skill_market"),
        20 => Ok("skills_collection"),
        30 => Ok("agent"),
        40 => Ok("mcp"),
        _ => match dataset {
            "agent-skills" => Ok("skill_market"),
            "agents" => Ok("agent"),
            "mcp" => Ok("mcp"),
            other => Err(DomainError::new(format!(
                "unsupported c_category seed scope for dataset {other} with categoryType {legacy_category_type}"
            ))),
        },
    }
}

pub const DEFAULT_ADMIN_CATEGORY_SEED_DATASETS: &[&str] =
    &["product", "agents", "agent-skills", "mcp"];

pub fn load_admin_category_seed_bundles(
    datasets: &[String],
) -> DomainResult<Vec<AdminCategorySeedBundle>> {
    let mut bundles = Vec::with_capacity(datasets.len());
    for dataset in datasets {
        let source = match dataset.as_str() {
            "product" => PRODUCT_CATEGORY_SEED_JSON,
            "agents" => AGENT_CATEGORY_SEED_JSON,
            "agent-skills" => AGENT_SKILL_CATEGORY_SEED_JSON,
            "mcp" => MCP_CATEGORY_SEED_JSON,
            other => {
                return Err(DomainError::new(format!(
                    "unsupported category seed dataset {other}"
                )));
            }
        };
        let bundle: AdminCategorySeedBundle = serde_json::from_str(source).map_err(|error| {
            DomainError::new(format!("invalid category seed dataset {dataset}: {error}"))
        })?;
        validate_bundle(dataset, &bundle)?;
        bundles.push(bundle);
    }
    Ok(bundles)
}

fn validate_bundle(dataset: &str, bundle: &AdminCategorySeedBundle) -> DomainResult<()> {
    if bundle.schema_version != 1 {
        return Err(DomainError::new(format!(
            "category seed dataset {dataset} has unsupported schemaVersion {}",
            bundle.schema_version
        )));
    }
    if bundle.kind != "sdkwork.category_seed" {
        return Err(DomainError::new(format!(
            "category seed dataset {dataset} has invalid kind {}",
            bundle.kind
        )));
    }
    if bundle.dataset != dataset {
        return Err(DomainError::new(format!(
            "category seed dataset {dataset} manifest declares {}",
            bundle.dataset
        )));
    }
    if !matches!(
        bundle.target.as_str(),
        "commerce_product_category" | "c_category"
    ) {
        return Err(DomainError::new(format!(
            "category seed dataset {dataset} has unsupported target {}",
            bundle.target
        )));
    }
    if bundle.target == "c_category"
        && (bundle.category_type.is_none()
            || bundle
                .group_name
                .as_deref()
                .map(str::trim)
                .unwrap_or_default()
                .is_empty())
    {
        return Err(DomainError::new(format!(
            "c_category seed dataset {dataset} requires categoryType and groupName"
        )));
    }
    Ok(())
}
