use std::collections::{BTreeMap, BTreeSet};
use std::error::Error;
use std::fmt::{Display, Formatter};

use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use sha2::{Digest, Sha256};

use sdkwork_models::{ClientApiCompatibility, ModelCatalog, ModelInfo, VendorCatalog};

pub(crate) const DEFAULT_CATALOG_REFRESH_SOURCE: &str = "sdkwork_models";

pub(crate) fn pricing_catalog_key(vendor_code: &str, model_id: &str) -> String {
    model_catalog_key(vendor_code, model_id)
}

pub(crate) fn model_catalog_key(vendor_code: &str, model_id: &str) -> String {
    format!("{vendor_code}/{model_id}")
}

pub(crate) fn catalog_identity_models(
    catalog: &ModelCatalog,
) -> BTreeMap<String, (&VendorCatalog, &ModelInfo)> {
    let mut models: BTreeMap<String, (&VendorCatalog, &ModelInfo)> = BTreeMap::new();
    for vendor in &catalog.vendors {
        for model in &vendor.models {
            let key = model_catalog_key(&model.vendor_code, &model.model_id);
            let replace = models
                .get(&key)
                .map(|(existing_vendor, existing_model)| {
                    model_identity_score(vendor, model)
                        > model_identity_score(existing_vendor, existing_model)
                })
                .unwrap_or(true);
            if replace {
                models.insert(key, (vendor, model));
            }
        }
    }
    models
}

pub(crate) fn public_catalog_identity_models(
    catalog: &ModelCatalog,
) -> BTreeMap<String, (&VendorCatalog, &ModelInfo)> {
    catalog_identity_models(catalog)
        .into_iter()
        .filter(|(_, (_, model))| sdkwork_model_is_publicly_active(model))
        .collect()
}

fn model_identity_score(vendor: &VendorCatalog, model: &ModelInfo) -> i32 {
    let has_region_pricing = vendor
        .pricing
        .iter()
        .any(|pricing| pricing.model_id == model.model_id && !pricing.prices.is_empty());
    let mut score = 0;
    if has_region_pricing {
        score += 100;
    }
    if model.routing_state == "enabled" {
        score += 40;
    }
    if model.shelf_state == "listed" {
        score += 20;
    }
    if model.release_stage == "active" {
        score += 10;
    }
    if matches!(model.lifecycle.as_str(), "current" | "preview") {
        score += 5;
    }
    if vendor.region_code == "global" {
        score += 1;
    }
    score
}

pub(crate) fn sdkwork_model_is_publicly_active(model: &ModelInfo) -> bool {
    matches!(model.release_stage.as_str(), "active" | "preview")
        && model.shelf_state == "listed"
        && model.routing_state == "enabled"
        && !matches!(
            model.lifecycle.as_str(),
            "deprecated" | "catalog_only" | "retired"
        )
}

#[derive(Debug)]
pub(crate) enum CatalogImportError {
    Catalog(sdkwork_models::CatalogError),
    CatalogVersionMismatch { expected: String, actual: String },
    UnknownVendors(Vec<String>),
}

impl Display for CatalogImportError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Catalog(error) => write!(formatter, "{error}"),
            Self::CatalogVersionMismatch { expected, actual } => write!(
                formatter,
                "sdkwork-models catalog version mismatch: expected {expected}, loaded {actual}"
            ),
            Self::UnknownVendors(vendors) => {
                write!(
                    formatter,
                    "sdkwork-models catalog does not define vendor(s): {}",
                    vendors.join(", ")
                )
            }
        }
    }
}

impl Error for CatalogImportError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Catalog(error) => Some(error),
            Self::CatalogVersionMismatch { .. } | Self::UnknownVendors(_) => None,
        }
    }
}

impl From<sdkwork_models::CatalogError> for CatalogImportError {
    fn from(value: sdkwork_models::CatalogError) -> Self {
        Self::Catalog(value)
    }
}

pub(crate) fn load_runtime_model_catalog() -> Result<ModelCatalog, CatalogImportError> {
    let catalog_root = std::env::var("SDKWORK_MODELS_CATALOG_ROOT")
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    load_catalog_root_with_pin(catalog_root.as_deref(), None)
}

pub(crate) fn runtime_pricing_dictionary_rows(
) -> Result<BundledPricingDictionaryRows, CatalogImportError> {
    Ok(bundled_pricing_dictionary_rows(
        &load_runtime_model_catalog()?,
    ))
}

pub(crate) fn load_catalog_root_with_pin(
    catalog_root: Option<&str>,
    catalog_version: Option<&str>,
) -> Result<ModelCatalog, CatalogImportError> {
    let catalog = match catalog_root
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(root) => sdkwork_models::load_catalog(root)?,
        None => sdkwork_models::load_bundled_catalog()?,
    };
    validate_catalog_version_pin(&catalog, catalog_version)?;
    Ok(catalog)
}

pub(crate) fn catalog_with_selected_vendors(
    catalog: &ModelCatalog,
    vendor_codes: &[String],
) -> Result<ModelCatalog, CatalogImportError> {
    let requested = normalized_vendor_set(vendor_codes);
    if requested.is_empty() {
        return Ok(catalog.clone());
    }

    let available = catalog
        .vendors
        .iter()
        .map(|vendor| vendor.vendor.vendor_code.clone())
        .collect::<BTreeSet<_>>();
    let missing = requested
        .iter()
        .filter(|vendor_code| !available.contains(*vendor_code))
        .cloned()
        .collect::<Vec<_>>();
    if !missing.is_empty() {
        return Err(CatalogImportError::UnknownVendors(missing));
    }

    Ok(ModelCatalog {
        manifest: catalog.manifest.clone(),
        meters: catalog.meters.clone(),
        protocols: catalog.protocols.clone(),
        vendors: catalog
            .vendors
            .iter()
            .filter(|vendor| requested.contains(&vendor.vendor.vendor_code))
            .cloned()
            .collect(),
    })
}

pub(crate) fn catalog_scope_vendor_codes(catalog: &ModelCatalog) -> Vec<String> {
    catalog_vendor_records(catalog)
        .into_iter()
        .map(|vendor| vendor.vendor_code)
        .collect()
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct CatalogVendorRecord {
    pub vendor_code: String,
    pub display_name: String,
    pub legal_name: Option<String>,
    pub description: Option<String>,
    pub website_url: Option<String>,
    pub docs_url: Option<String>,
    pub country_region: Option<String>,
    pub vendor_type: String,
    pub model_families: Vec<String>,
    pub capabilities: Vec<String>,
    pub supported_protocols: Vec<String>,
    pub client_api_compatibility: BTreeMap<String, ClientApiCompatibility>,
    pub open_source: bool,
    pub sort_order: i32,
    pub source_url: String,
}

pub(crate) fn catalog_vendor_records(catalog: &ModelCatalog) -> Vec<CatalogVendorRecord> {
    let mut vendors = BTreeMap::<String, CatalogVendorRecord>::new();
    for region_catalog in &catalog.vendors {
        let vendor = &region_catalog.vendor;
        let record = vendors
            .entry(vendor.vendor_code.clone())
            .or_insert_with(|| CatalogVendorRecord {
                vendor_code: vendor.vendor_code.clone(),
                display_name: vendor.display_name.clone(),
                legal_name: vendor.legal_name.clone(),
                description: vendor.description.clone(),
                website_url: vendor.website_url.clone(),
                docs_url: vendor.docs_url.clone(),
                country_region: vendor.country_region.clone(),
                vendor_type: vendor.vendor_type.clone(),
                model_families: Vec::new(),
                capabilities: Vec::new(),
                supported_protocols: Vec::new(),
                client_api_compatibility: BTreeMap::new(),
                open_source: vendor.open_source.unwrap_or(false),
                sort_order: vendor.sort_order.unwrap_or(1_000_000),
                source_url: vendor.source.source_url.clone(),
            });
        append_unique(&mut record.model_families, vendor.model_families.iter());
        append_unique(&mut record.capabilities, vendor.capabilities.iter());
        append_unique(
            &mut record.supported_protocols,
            vendor.supported_protocols.iter(),
        );
        for (client_api_code, compatibility) in &vendor.client_api_compatibility {
            match record.client_api_compatibility.get(client_api_code) {
                Some(existing)
                    if client_api_support_rank(&existing.support_status)
                        >= client_api_support_rank(&compatibility.support_status) => {}
                _ => {
                    record
                        .client_api_compatibility
                        .insert(client_api_code.clone(), compatibility.clone());
                }
            }
        }
    }
    vendors.into_values().collect()
}

fn append_unique<'a>(target: &mut Vec<String>, values: impl IntoIterator<Item = &'a String>) {
    for value in values {
        if !target.contains(value) {
            target.push(value.clone());
        }
    }
}

fn client_api_support_rank(value: &str) -> i32 {
    match value {
        "supported" => 3,
        "compatible" => 2,
        "unsupported" => 1,
        _ => 0,
    }
}

pub(crate) fn catalog_scope_model_count(catalog: &ModelCatalog) -> usize {
    catalog_identity_models(catalog).len()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct CatalogScopeCounts {
    pub meter_count: usize,
    pub vendor_count: usize,
    pub family_count: usize,
    pub model_count: usize,
    pub capability_count: usize,
    pub price_count: usize,
    pub ranking_count: usize,
    pub voice_count: usize,
    pub voice_binding_count: usize,
    pub video_profile_count: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct CatalogAuthorityKeys {
    pub vendor_codes: Vec<String>,
    pub catalog_keys: Vec<String>,
    pub family_uuids: Vec<String>,
    pub capability_uuids: Vec<String>,
    pub price_uuids: Vec<String>,
    pub ranking_uuids: Vec<String>,
    pub vendor_modality_uuids: Vec<String>,
    pub vendor_api_endpoint_uuids: Vec<String>,
    pub model_modality_uuids: Vec<String>,
    pub model_api_endpoint_uuids: Vec<String>,
    pub ai_resource_codes: Vec<String>,
}

impl CatalogScopeCounts {
    pub fn accepted_count(self) -> i64 {
        (self.meter_count
            + self.vendor_count
            + self.family_count
            + self.model_count
            + self.capability_count
            + self.price_count
            + self.ranking_count
            + self.voice_count
            + self.voice_binding_count
            + self.video_profile_count) as i64
    }
}

pub(crate) fn catalog_scope_counts(catalog: &ModelCatalog) -> CatalogScopeCounts {
    let identity_models = public_catalog_identity_models(catalog);
    let model_catalog_keys = identity_models.keys().cloned().collect::<BTreeSet<_>>();
    let capability_count = identity_models
        .values()
        .flat_map(|(_, model)| {
            let capabilities = if model.capabilities.is_empty() {
                vec![model.primary_capability.clone()]
            } else {
                model.capabilities.clone()
            };
            capabilities.into_iter().map(move |capability| {
                model_catalog_key(&model.vendor_code, &model.model_id) + "/" + &capability
            })
        })
        .collect::<BTreeSet<_>>()
        .len();
    let public_model_keys = public_catalog_identity_models(catalog)
        .keys()
        .cloned()
        .collect::<BTreeSet<_>>();
    let price_count = catalog
        .vendors
        .iter()
        .flat_map(|vendor| vendor.pricing.iter())
        .filter(|pricing| {
            public_model_keys.contains(&model_catalog_key(&pricing.vendor_code, &pricing.model_id))
        })
        .map(|pricing| pricing.prices.len())
        .sum();
    let ranking_count = catalog
        .vendors
        .iter()
        .flat_map(|vendor| {
            let vendor_code = vendor.vendor.vendor_code.as_str();
            vendor.rankings.iter().flat_map(move |snapshot| {
                snapshot.items.iter().map(move |item| {
                    (
                        model_catalog_key(vendor_code, &item.model_id),
                        pricing_catalog_key(vendor_code, &item.model_id),
                    )
                })
            })
        })
        .filter(|(model_catalog_key, _)| model_catalog_keys.contains(model_catalog_key))
        .count();
    let voice_count = catalog
        .vendors
        .iter()
        .map(|vendor| vendor.voices.len())
        .sum();
    let voice_binding_count = catalog
        .vendors
        .iter()
        .flat_map(|vendor| vendor.model_voice_bindings.iter())
        .map(|binding_file| binding_file.bindings.len())
        .sum();
    let video_profile_count = catalog
        .vendors
        .iter()
        .flat_map(|vendor| vendor.model_video_profiles.iter())
        .map(|profile_file| profile_file.profiles.len())
        .sum();
    CatalogScopeCounts {
        meter_count: catalog.meters.len(),
        vendor_count: catalog_scope_vendor_codes(catalog).len(),
        family_count: catalog
            .vendors
            .iter()
            .flat_map(|vendor| {
                vendor.families.iter().map(|family| {
                    (
                        vendor.vendor.vendor_code.clone(),
                        family.family_code.clone(),
                    )
                })
            })
            .collect::<BTreeSet<_>>()
            .len(),
        model_count: catalog_scope_model_count(catalog),
        capability_count,
        price_count,
        ranking_count,
        voice_count,
        voice_binding_count,
        video_profile_count,
    }
}

pub(crate) fn catalog_authority_keys(catalog: &ModelCatalog) -> CatalogAuthorityKeys {
    let vendor_codes = catalog
        .vendors
        .iter()
        .map(|vendor| vendor.vendor.vendor_code.clone())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    let catalog_keys = catalog_identity_models(catalog)
        .keys()
        .cloned()
        .collect::<Vec<_>>();
    let public_catalog_keys = public_catalog_identity_models(catalog)
        .keys()
        .cloned()
        .collect::<Vec<_>>();
    let model_catalog_key_set = public_catalog_keys.iter().cloned().collect::<BTreeSet<_>>();
    let family_uuids = catalog
        .vendors
        .iter()
        .flat_map(|vendor| {
            vendor.families.iter().map(|family| {
                stable_uuid(
                    "sdk-family",
                    &[&vendor.vendor.vendor_code, &family.family_code],
                )
            })
        })
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    let capability_uuids = public_catalog_identity_models(catalog)
        .values()
        .flat_map(|(_, model)| {
            let capabilities = if model.capabilities.is_empty() {
                vec![model.primary_capability.clone()]
            } else {
                model.capabilities.clone()
            };
            capabilities.into_iter().map(move |capability| {
                stable_uuid(
                    "sdk-cap",
                    &[&model.vendor_code, &model.model_id, &capability],
                )
            })
        })
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    let price_uuids = catalog
        .vendors
        .iter()
        .flat_map(|vendor| {
            vendor.pricing.iter().flat_map(|pricing| {
                pricing.prices.iter().map(|price| {
                    (
                        model_catalog_key(&pricing.vendor_code, &pricing.model_id),
                        stable_uuid(
                            "sdk-price",
                            &[
                                &pricing.vendor_code,
                                &pricing.region_code,
                                &pricing.model_id,
                                &price.price_id,
                            ],
                        ),
                    )
                })
            })
        })
        .filter_map(|(catalog_key, uuid)| {
            if model_catalog_key_set.contains(&catalog_key) {
                Some(uuid)
            } else {
                None
            }
        })
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    let ranking_uuids = catalog
        .vendors
        .iter()
        .flat_map(|vendor| {
            let vendor_code = vendor.vendor.vendor_code.clone();
            let region_code = vendor.vendor.region_code.clone();
            let model_catalog_key_set = model_catalog_key_set.clone();
            vendor.rankings.iter().flat_map(move |snapshot| {
                let vendor_code = vendor_code.clone();
                let region_code = region_code.clone();
                let model_catalog_key_set = model_catalog_key_set.clone();
                snapshot.items.iter().filter_map(move |item| {
                    let model_catalog_key = model_catalog_key(&vendor_code, &item.model_id);
                    if model_catalog_key_set.contains(&model_catalog_key) {
                        Some(stable_uuid(
                            "sdk-rank",
                            &[
                                &snapshot.snapshot_date,
                                &snapshot.rank_scope,
                                &vendor_code,
                                &region_code,
                                &item.model_id,
                            ],
                        ))
                    } else {
                        None
                    }
                })
            })
        })
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();

    CatalogAuthorityKeys {
        vendor_codes,
        catalog_keys,
        family_uuids,
        capability_uuids,
        price_uuids,
        ranking_uuids,
        vendor_modality_uuids: catalog_vendor_modality_projections(catalog)
            .into_iter()
            .map(|item| item.uuid)
            .collect(),
        vendor_api_endpoint_uuids: catalog_vendor_api_endpoint_projections(catalog)
            .into_iter()
            .map(|item| item.uuid)
            .collect(),
        model_modality_uuids: catalog_model_modality_projections(catalog)
            .into_iter()
            .map(|item| item.uuid)
            .collect(),
        model_api_endpoint_uuids: catalog_model_api_endpoint_projections(catalog)
            .into_iter()
            .map(|item| item.uuid)
            .collect(),
        ai_resource_codes: catalog_ai_resource_projections(catalog)
            .into_iter()
            .map(|item| item.resource_code)
            .collect(),
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct CatalogModalityProjection {
    pub uuid: String,
    pub modality_code: String,
    pub display_name: String,
    pub modality_group: String,
    pub description: String,
    pub input_supported: bool,
    pub output_supported: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct CatalogApiEndpointProjection {
    pub uuid: String,
    pub endpoint_code: String,
    pub protocol_code: String,
    pub display_name: String,
    pub method: String,
    pub path_template: String,
    pub streaming_supported: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct CatalogVendorModalityProjection {
    pub uuid: String,
    pub vendor_code: String,
    pub modality_code: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct CatalogVendorApiEndpointProjection {
    pub uuid: String,
    pub vendor_code: String,
    pub endpoint_code: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct CatalogModalityApiEndpointProjection {
    pub uuid: String,
    pub modality_code: String,
    pub endpoint_code: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct CatalogModelModalityProjection {
    pub uuid: String,
    pub catalog_key: String,
    pub model: String,
    pub vendor_code: String,
    pub modality_code: String,
    pub direction: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct CatalogModelApiEndpointProjection {
    pub uuid: String,
    pub catalog_key: String,
    pub model: String,
    pub vendor_code: String,
    pub endpoint_code: String,
    pub provider_native_model: String,
    pub default_parameters: String,
    pub supports_streaming: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct CatalogAiResourceProjection {
    pub uuid: String,
    pub resource_code: String,
    pub resource_kind: String,
    pub display_name: String,
    pub vendor_code: Option<String>,
    pub modality_code: Option<String>,
    pub api_endpoint_code: Option<String>,
    pub catalog_key: Option<String>,
    pub model: Option<String>,
    pub provider_native_model: Option<String>,
    pub composition_mode: String,
    pub capability_schema: String,
    pub metadata_schema: String,
    pub description: Option<String>,
    pub sort_order: i32,
}

pub(crate) fn catalog_modality_projections(
    catalog: &ModelCatalog,
) -> Vec<CatalogModalityProjection> {
    let mut usage = public_catalog_identity_models(catalog)
        .into_values()
        .map(|(_, model)| model)
        .fold(
            BTreeMap::<String, (bool, bool)>::new(),
            |mut usage, model| {
                for modality in &model.input_modalities {
                    let entry = usage.entry(modality.clone()).or_insert((false, false));
                    entry.0 = true;
                }
                for modality in &model.output_modalities {
                    let entry = usage.entry(modality.clone()).or_insert((false, false));
                    entry.1 = true;
                }
                usage
                    .entry(model.primary_capability.clone())
                    .or_insert((true, true));
                usage
            },
        );
    for meter in &catalog.meters {
        usage.entry(meter.modality.clone()).or_insert((true, true));
    }
    usage
        .into_iter()
        .enumerate()
        .map(
            |(index, (modality_code, (input_supported, output_supported)))| {
                CatalogModalityProjection {
                    uuid: stable_uuid("sdk-modality", &[&modality_code]),
                    display_name: modality_display_name(&modality_code),
                    modality_group: modality_group(&modality_code).to_owned(),
                    description: modality_description(&modality_code),
                    sort_order: modality_sort_order(&modality_code)
                        .unwrap_or((index as i32) + 1000),
                    modality_code,
                    input_supported,
                    output_supported,
                }
            },
        )
        .collect()
}

pub(crate) fn catalog_api_endpoint_projections(
    catalog: &ModelCatalog,
) -> Vec<CatalogApiEndpointProjection> {
    public_catalog_identity_models(catalog)
        .into_values()
        .map(|(_, model)| model)
        .map(model_endpoint_descriptor)
        .map(|descriptor| (descriptor.endpoint_code.to_owned(), descriptor))
        .collect::<BTreeMap<_, _>>()
        .into_values()
        .map(|descriptor| CatalogApiEndpointProjection {
            uuid: stable_uuid("sdk-api-endpoint", &[descriptor.endpoint_code]),
            endpoint_code: descriptor.endpoint_code.to_owned(),
            protocol_code: descriptor.protocol_code.to_owned(),
            display_name: descriptor.display_name.to_owned(),
            method: descriptor.method.to_owned(),
            path_template: descriptor.path_template.to_owned(),
            streaming_supported: descriptor.streaming_supported,
            sort_order: descriptor.sort_order,
        })
        .collect()
}

pub(crate) fn catalog_vendor_modality_projections(
    catalog: &ModelCatalog,
) -> Vec<CatalogVendorModalityProjection> {
    public_catalog_identity_models(catalog)
        .into_values()
        .flat_map(|(_, model)| {
            model_modality_codes(model)
                .into_iter()
                .map(move |modality_code| (model.vendor_code.clone(), modality_code))
        })
        .collect::<BTreeSet<_>>()
        .into_iter()
        .enumerate()
        .map(
            |(index, (vendor_code, modality_code))| CatalogVendorModalityProjection {
                uuid: stable_uuid("sdk-vendor-modality", &[&vendor_code, &modality_code]),
                vendor_code,
                modality_code,
                sort_order: (index as i32) + 1,
            },
        )
        .collect()
}

pub(crate) fn catalog_vendor_api_endpoint_projections(
    catalog: &ModelCatalog,
) -> Vec<CatalogVendorApiEndpointProjection> {
    public_catalog_identity_models(catalog)
        .into_values()
        .map(|(_, model)| {
            (
                model.vendor_code.clone(),
                model_endpoint_descriptor(model).endpoint_code.to_owned(),
            )
        })
        .collect::<BTreeSet<_>>()
        .into_iter()
        .enumerate()
        .map(
            |(index, (vendor_code, endpoint_code))| CatalogVendorApiEndpointProjection {
                uuid: stable_uuid("sdk-vendor-endpoint", &[&vendor_code, &endpoint_code]),
                vendor_code,
                endpoint_code,
                sort_order: (index as i32) + 1,
            },
        )
        .collect()
}

pub(crate) fn catalog_modality_api_endpoint_projections(
    catalog: &ModelCatalog,
) -> Vec<CatalogModalityApiEndpointProjection> {
    public_catalog_identity_models(catalog)
        .into_values()
        .map(|(_, model)| model)
        .flat_map(|model| {
            let endpoint_code = model_endpoint_descriptor(model).endpoint_code.to_owned();
            model_endpoint_modalities(model)
                .into_iter()
                .map(move |modality_code| (modality_code, endpoint_code.clone()))
        })
        .collect::<BTreeSet<_>>()
        .into_iter()
        .enumerate()
        .map(
            |(index, (modality_code, endpoint_code))| CatalogModalityApiEndpointProjection {
                uuid: stable_uuid("sdk-modality-endpoint", &[&modality_code, &endpoint_code]),
                modality_code,
                endpoint_code,
                sort_order: (index as i32) + 1,
            },
        )
        .collect()
}

pub(crate) fn catalog_model_modality_projections(
    catalog: &ModelCatalog,
) -> Vec<CatalogModelModalityProjection> {
    public_catalog_identity_models(catalog)
        .into_iter()
        .flat_map(|(catalog_key, (_, model))| {
            model_modality_directions(model)
                .into_iter()
                .map(
                    move |(modality_code, direction)| CatalogModelModalityProjection {
                        uuid: stable_uuid(
                            "sdk-model-modality",
                            &[&catalog_key, &modality_code, &direction],
                        ),
                        catalog_key: catalog_key.clone(),
                        model: model.model_id.clone(),
                        vendor_code: model.vendor_code.clone(),
                        modality_code,
                        direction,
                        sort_order: 1,
                    },
                )
        })
        .collect()
}

pub(crate) fn catalog_model_api_endpoint_projections(
    catalog: &ModelCatalog,
) -> Vec<CatalogModelApiEndpointProjection> {
    public_catalog_identity_models(catalog)
        .into_iter()
        .enumerate()
        .map(|(index, (catalog_key, (_, model)))| {
            let endpoint = model_endpoint_descriptor(model);
            CatalogModelApiEndpointProjection {
                uuid: stable_uuid(
                    "sdk-model-endpoint",
                    &[&catalog_key, endpoint.endpoint_code],
                ),
                catalog_key,
                model: model.model_id.clone(),
                vendor_code: model.vendor_code.clone(),
                endpoint_code: endpoint.endpoint_code.to_owned(),
                provider_native_model: model.model_id.clone(),
                default_parameters: "{}".to_owned(),
                supports_streaming: model.supports_streaming,
                sort_order: (index as i32) + 1,
            }
        })
        .collect()
}

pub(crate) fn catalog_ai_resource_projections(
    catalog: &ModelCatalog,
) -> Vec<CatalogAiResourceProjection> {
    let mut resources = BTreeMap::<String, CatalogAiResourceProjection>::new();
    for (index, vendor) in catalog
        .vendors
        .iter()
        .map(|vendor| &vendor.vendor)
        .map(|vendor| (vendor.vendor_code.clone(), vendor))
        .collect::<BTreeMap<_, _>>()
        .into_values()
        .enumerate()
    {
        let resource_code = format!("vendor.{}", vendor.vendor_code);
        resources.insert(
            resource_code.clone(),
            CatalogAiResourceProjection {
                uuid: stable_uuid("sdk-cap-resource", &[&resource_code]),
                resource_code,
                resource_kind: "vendor".to_owned(),
                display_name: vendor.display_name.clone(),
                vendor_code: Some(vendor.vendor_code.clone()),
                modality_code: None,
                api_endpoint_code: None,
                catalog_key: None,
                model: None,
                provider_native_model: None,
                composition_mode: "single".to_owned(),
                capability_schema: "{}".to_owned(),
                metadata_schema: "{}".to_owned(),
                description: vendor.description.clone(),
                sort_order: (index as i32) + 1,
            },
        );
    }

    for (index, modality) in catalog_modality_resource_projections(catalog)
        .into_iter()
        .enumerate()
    {
        let resource_code = format!("modality.{}", modality.modality_code);
        resources.insert(
            resource_code.clone(),
            CatalogAiResourceProjection {
                uuid: stable_uuid("sdk-cap-resource", &[&resource_code]),
                resource_code,
                resource_kind: "modality".to_owned(),
                display_name: modality.display_name,
                vendor_code: None,
                modality_code: Some(modality.modality_code),
                api_endpoint_code: None,
                catalog_key: None,
                model: None,
                provider_native_model: None,
                composition_mode: "single".to_owned(),
                capability_schema: serde_json::json!({
                    "modalityGroup": modality.modality_group,
                    "inputSupported": modality.input_supported,
                    "outputSupported": modality.output_supported
                })
                .to_string(),
                metadata_schema: "{}".to_owned(),
                description: Some(modality.description),
                sort_order: 5_000 + modality.sort_order + (index as i32),
            },
        );
    }

    for endpoint in catalog_api_endpoint_projections(catalog) {
        let resource_code = format!("api.{}", endpoint.endpoint_code);
        resources.insert(
            resource_code.clone(),
            CatalogAiResourceProjection {
                uuid: stable_uuid("sdk-cap-resource", &[&resource_code]),
                resource_code,
                resource_kind: "api_endpoint".to_owned(),
                display_name: endpoint.display_name,
                vendor_code: endpoint_vendor_code(&endpoint.endpoint_code),
                modality_code: endpoint_modality_code(&endpoint.endpoint_code),
                api_endpoint_code: Some(endpoint.endpoint_code),
                catalog_key: None,
                model: None,
                provider_native_model: None,
                composition_mode: "single".to_owned(),
                capability_schema: "{}".to_owned(),
                metadata_schema: "{}".to_owned(),
                description: Some("Model catalog API endpoint capability".to_owned()),
                sort_order: 10_000 + endpoint.sort_order,
            },
        );
    }

    for (index, (catalog_key, (_, model))) in public_catalog_identity_models(catalog)
        .into_iter()
        .enumerate()
    {
        let endpoint = model_endpoint_descriptor(model);
        let modality_code = model_resource_suffix(model);
        let resource_code = format!(
            "model.{}.{}.{}",
            model.vendor_code, model.model_id, modality_code
        );
        resources.insert(
            resource_code.clone(),
            CatalogAiResourceProjection {
                uuid: stable_uuid("sdk-cap-resource", &[&resource_code]),
                resource_code,
                resource_kind: "model_api".to_owned(),
                display_name: if model.display_name.trim().is_empty() {
                    model.model_id.clone()
                } else {
                    model.display_name.clone()
                },
                vendor_code: Some(model.vendor_code.clone()),
                modality_code: Some(modality_code),
                api_endpoint_code: Some(endpoint.endpoint_code.to_owned()),
                catalog_key: Some(catalog_key),
                model: Some(model.model_id.clone()),
                provider_native_model: Some(model.model_id.clone()),
                composition_mode: "single".to_owned(),
                capability_schema: serde_json::json!({
                    "capability": &model.primary_capability,
                    "capabilities": if model.capabilities.is_empty() {
                        vec![model.primary_capability.clone()]
                    } else {
                        model.capabilities.clone()
                    },
                    "inputModalities": &model.input_modalities,
                    "outputModalities": &model.output_modalities,
                    "apiFormat": &model.api_format,
                    "supportsStreaming": model.supports_streaming,
                    "supportsTools": model.supports_tools,
                    "supportsJsonSchema": model.supports_json_schema
                })
                .to_string(),
                metadata_schema: "{}".to_owned(),
                description: model.description.clone(),
                sort_order: 20_000 + (index as i32) + 1,
            },
        );
    }

    resources.into_values().collect()
}

fn catalog_modality_resource_projections(catalog: &ModelCatalog) -> Vec<CatalogModalityProjection> {
    let mut modalities = catalog_modality_projections(catalog);
    if modalities.iter().any(|modality| {
        matches!(
            modality.modality_code.as_str(),
            "chat" | "text" | "embedding" | "rerank"
        )
    }) && !modalities
        .iter()
        .any(|modality| modality.modality_code == "llm")
    {
        modalities.push(CatalogModalityProjection {
            uuid: stable_uuid("sdk-modality", &["llm"]),
            modality_code: "llm".to_owned(),
            display_name: modality_display_name("llm"),
            modality_group: modality_group("llm").to_owned(),
            input_supported: true,
            output_supported: true,
            description: modality_description("llm"),
            sort_order: modality_sort_order("llm").unwrap_or(5),
        });
    }
    modalities
}

pub(crate) fn model_resource_suffix(model: &ModelInfo) -> String {
    if model.primary_capability == "chat" {
        "chat".to_owned()
    } else {
        model.primary_capability.clone()
    }
}

#[derive(Debug, Clone, Copy)]
struct EndpointDescriptor {
    endpoint_code: &'static str,
    protocol_code: &'static str,
    display_name: &'static str,
    method: &'static str,
    path_template: &'static str,
    streaming_supported: bool,
    sort_order: i32,
}

/// The vendor-native image endpoint of a vendor, when the vendor publishes one.
///
/// `primaryCapability` alone cannot choose an image endpoint: `image` is carried
/// by 11 catalog vendors whose HTTP surfaces are **not** interchangeable. Before
/// this table existed every one of the 49 bound image models landed on
/// `openai.images` — including the 42 whose own `apiFormat` says
/// `vendor_native` — so an image request for, say, `google/gemini-3-pro-image`
/// was planned on an OpenAI-compatible endpoint even though the catalog declares
/// `google_gemini` and the classifier
/// (`provider_native_classifier.rs`) would replay it to
/// `/v1beta/models/{model}:generateImages`.
///
/// Keys are the *catalog* `vendorCode` (the model's own `vendorCode`), which is
/// not always the account-side/endpoint-side vendor name — `google` publishes
/// `gemini.*` endpoints, `bytedance` publishes `jimeng.*`, `kuaishou` publishes
/// `kling.*`. Vendors absent from this table keep the OpenAI-compatible
/// `openai.images` surface, which is the honest answer for them: the catalog
/// declares no native image API for those vendors.
///
/// This function is duplicated in the cloud router's own copy of
/// `model_catalog_import`. Keep both copies in step: this one *writes* the rows
/// and the router's copy *reads* them for `catalog_expectations`.
fn vendor_native_image_descriptor(vendor_code: &str) -> Option<EndpointDescriptor> {
    let descriptor = match vendor_code {
        // `google` is the catalog vendor code; its native image surface is the
        // Gemini `:generateImages` action.
        "google" | "gemini" => EndpointDescriptor {
            endpoint_code: "gemini.image_generation",
            protocol_code: "vendor_native",
            display_name: "Gemini Image Generation",
            method: "POST",
            path_template: "/v1beta/models/{model}:generateImages",
            streaming_supported: false,
            sort_order: 440,
        },
        "bytedance" | "jimeng" => EndpointDescriptor {
            endpoint_code: "jimeng.image_generation",
            protocol_code: "vendor_native",
            display_name: "Jimeng Image Generation",
            method: "POST",
            path_template: "/v1/images/generations",
            streaming_supported: false,
            sort_order: 510,
        },
        "kuaishou" | "kling" => EndpointDescriptor {
            endpoint_code: "kling.image_generation",
            protocol_code: "vendor_native",
            display_name: "Kling Image Generation",
            method: "POST",
            path_template: "/v1/images/generations",
            streaming_supported: false,
            sort_order: 490,
        },
        "volcengine" => EndpointDescriptor {
            endpoint_code: "volcengine.image_generation",
            protocol_code: "vendor_native",
            display_name: "Volcengine Image Generation",
            method: "POST",
            path_template: "/api/v3/images/generations",
            streaming_supported: false,
            sort_order: 540,
        },
        "vidu" => EndpointDescriptor {
            endpoint_code: "vidu.reference_to_image",
            protocol_code: "vendor_native",
            display_name: "Vidu Reference To Image",
            method: "POST",
            path_template: "/ent/v2/reference2image",
            streaming_supported: false,
            sort_order: 580,
        },
        // FLUX publishes one path per model (`POST /v1/{model}`), then hands back
        // a `polling_url`; `GET /v1/get_result?id=` is the documented result
        // route.
        "black_forest_labs" | "bfl" => EndpointDescriptor {
            endpoint_code: "black_forest_labs.image_generation",
            protocol_code: "vendor_native",
            display_name: "FLUX Image Generation",
            method: "POST",
            path_template: "/v1/flux-{model}",
            streaming_supported: false,
            sort_order: 600,
        },
        // Runway's Text/Image-to-Image surface: one endpoint carrying every
        // image model, discriminated by the body's `model` field.
        "runway" | "runwayml" => EndpointDescriptor {
            endpoint_code: "runway.image_generation",
            protocol_code: "vendor_native",
            display_name: "Runway Text/Image To Image",
            method: "POST",
            path_template: "/v1/text_to_image",
            streaming_supported: false,
            sort_order: 610,
        },
        // Stability distinguishes the model by the last path segment
        // (`core` / `ultra` / `sd3`) rather than by a body field.
        "stability_ai" | "stability" => EndpointDescriptor {
            endpoint_code: "stability_ai.image_generation",
            protocol_code: "vendor_native",
            display_name: "Stability Image Generation",
            method: "POST",
            path_template: "/v2beta/stable-image/generate/{mode}",
            streaming_supported: false,
            sort_order: 620,
        },
        _ => return None,
    };
    Some(descriptor)
}

/// The vendor-native image endpoint for a model, honouring both the model's
/// declared `apiFormat` and its catalog vendor code.
///
/// `apiFormat = "google_gemini"` is itself the native Gemini surface, so a
/// Gemini image model must land on `gemini.image_generation` even when its
/// vendor code were to drift. A `vendor_native` image model only moves off
/// `openai.images` when its vendor publishes a native image endpoint; otherwise
/// the call would be planned against a route the vendor never registered.
fn model_image_endpoint_descriptor(model: &ModelInfo) -> EndpointDescriptor {
    let native = vendor_native_image_descriptor(model.vendor_code.trim());
    if model.api_format == "google_gemini" {
        return native.unwrap_or_else(|| EndpointDescriptor {
            endpoint_code: "gemini.image_generation",
            protocol_code: "vendor_native",
            display_name: "Gemini Image Generation",
            method: "POST",
            path_template: "/v1beta/models/{model}:generateImages",
            streaming_supported: false,
            sort_order: 440,
        });
    }
    match native {
        // A native endpoint exists *and* the model claims a native surface.
        Some(descriptor) if model.api_format == "vendor_native" => descriptor,
        // A native endpoint exists but the model is declared OpenAI-compatible:
        // the model's own declaration wins, because the request body it will
        // receive is the OpenAI one.
        _ => EndpointDescriptor {
            endpoint_code: "openai.images",
            protocol_code: "openai_compatible",
            display_name: "OpenAI Images",
            method: "POST",
            path_template: "/v1/images/generations",
            streaming_supported: false,
            sort_order: 30,
        },
    }
}

/// The vendor-native video endpoint of a vendor, when the vendor publishes one.
///
/// Same defect as the image arm, one capability later. `primaryCapability =
/// "video"` is carried by 13 catalog vendors whose HTTP surfaces are not
/// interchangeable, yet every one of the 60 active video bindings landed on the
/// single generic `openai.video` (`POST /v1/videos`) — including the 55 whose
/// own `apiFormat` says `vendor_native`. Meanwhile the bundled catalog already
/// declared nine vendor-native video endpoints
/// (`ai_resource.api_code` / `data/ai-routing/resources/vendor-native-resources.json`)
/// and `provider_native_classifier.rs` already routed every one of their paths:
/// they simply had **zero** `ai_model_api_endpoint` rows, so no model could ever
/// reach them.
///
/// Keys are the *catalog* `vendorCode`, which is not the endpoint-side name —
/// `bytedance` publishes `jimeng.*`, `kuaishou` publishes `kling.*`, `google`
/// publishes `gemini.*`.
///
/// Vendors absent from this table keep the OpenAI-compatible `openai.video`
/// surface, which is the honest answer for them: the catalog declares no native
/// video API for those vendors. Keep both copies of this function in step (this
/// one *writes* the rows; the cloud router's copy *reads* them for
/// `catalog_expectations`).
fn vendor_native_video_descriptor(vendor_code: &str) -> Option<EndpointDescriptor> {
    let descriptor = match vendor_code {
        // Gemini's `:generateVideos` action (Veo family).
        "google" | "gemini" => EndpointDescriptor {
            endpoint_code: "gemini.video_generation",
            protocol_code: "vendor_native",
            display_name: "Gemini Video Generation",
            method: "POST",
            path_template: "/v1beta/models/{model}:generateVideos",
            streaming_supported: false,
            sort_order: 460,
        },
        // Kling's text-to-video surface. Its sibling operations
        // (`image2video` / `avatar` / `motion-control`) stay addressable through
        // the classifier but are not what a *video* model binds to; a video
        // model's entry point is text-to-video.
        "kuaishou" | "kling" => EndpointDescriptor {
            endpoint_code: "kling.text_to_video",
            protocol_code: "vendor_native",
            display_name: "Kling Text To Video",
            method: "POST",
            path_template: "/v1/videos/text2video",
            streaming_supported: false,
            sort_order: 470,
        },
        "bytedance" | "jimeng" => EndpointDescriptor {
            endpoint_code: "jimeng.video_generation",
            protocol_code: "vendor_native",
            display_name: "Jimeng Video Generation",
            method: "POST",
            path_template: "/v1/videos/generations",
            streaming_supported: false,
            sort_order: 520,
        },
        // Volcengine Ark submits an async task and polls it.
        "volcengine" => EndpointDescriptor {
            endpoint_code: "volcengine.video_generation",
            protocol_code: "vendor_native",
            display_name: "Volcengine Video Generation",
            method: "POST",
            path_template: "/api/v3/contents/generations/tasks",
            streaming_supported: false,
            sort_order: 550,
        },
        "vidu" => EndpointDescriptor {
            endpoint_code: "vidu.start_end_to_video",
            protocol_code: "vendor_native",
            display_name: "Vidu Start-End To Video",
            method: "POST",
            path_template: "/ent/v2/start-end2video",
            streaming_supported: false,
            sort_order: 590,
        },
        _ => return None,
    };
    Some(descriptor)
}

/// The vendor-native video endpoint for a model, honouring both the model's
/// declared `apiFormat` and its catalog vendor code.
///
/// `apiFormat = "google_gemini"` is itself the native Gemini surface, so a
/// Gemini video model (Veo) must land on `gemini.video_generation` even when its
/// vendor code were to drift. A `vendor_native` video model only moves off
/// `openai.video` when its vendor publishes a native video endpoint; otherwise
/// the call would be planned against a route the vendor never registered.
fn model_video_endpoint_descriptor(model: &ModelInfo) -> EndpointDescriptor {
    let native = vendor_native_video_descriptor(model.vendor_code.trim());
    if model.api_format == "google_gemini" {
        return native.unwrap_or_else(|| EndpointDescriptor {
            endpoint_code: "gemini.video_generation",
            protocol_code: "vendor_native",
            display_name: "Gemini Video Generation",
            method: "POST",
            path_template: "/v1beta/models/{model}:generateVideos",
            streaming_supported: false,
            sort_order: 460,
        });
    }
    match native {
        Some(descriptor) if model.api_format == "vendor_native" => descriptor,
        _ => EndpointDescriptor {
            endpoint_code: "openai.video",
            protocol_code: "openai_compatible",
            display_name: "Video Generation",
            method: "POST",
            path_template: "/v1/videos",
            streaming_supported: false,
            sort_order: 60,
        },
    }
}

/// The vendor-native audio endpoint of a vendor, when the vendor publishes one.
///
/// Same defect as the image arm (§15.25) and the video arm (§15.26), one
/// capability later. `primaryCapability = "audio"` is carried by 46 catalog
/// models across 6 vendors whose HTTP surfaces are not interchangeable, yet
/// **every one of the 40 bound audio models landed on the single generic
/// `openai.audio`** (`POST /v1/audio`) — including the 14 whose own `apiFormat`
/// says `vendor_native` (`bytedance` ×2, `elevenlabs` ×8, `minimax` ×6).
///
/// Consequences that are not cosmetic:
///
/// * `elevenlabs` text-to-speech replayed an OpenAI audio body to
///   `/v1/audio`, but the classifier only recognises
///   `/v1/text-to-speech/{voice_id}` for that vendor — so an ElevenLabs TTS
///   call could never be classified onto `elevenlabs.text_to_speech` and
///   reached no declared route at all.
/// * `volcengine.speech` (`/api/v3/audio/speech`) is declared as a resource,
///   routed by the classifier, granted by `official.volcengine.full` — and had
///   **zero** models bound to it.
///
/// The table below is deliberately restricted to endpoints that are already
/// wired **end to end**: present in `data/ai-routing/resources/
/// vendor-native-resources.json`, classified by
/// `provider_native_api_code_from_standard_path` (both copies), and granted by
/// an `official.<vendor>.full` resource group. Inventing a path for a vendor
/// whose native surface the project has not declared would create a route with
/// no resource, no grant and no classifier arm — the exact "declared but
/// unreachable" shape this audit exists to eliminate. So `minimax`,
/// `bytedance` and `xiaomi` stay on `openai.audio`: for them that is the honest
/// answer, because the catalog declares no native audio endpoint for those
/// vendors (they publish OpenAI-compatible audio surfaces).
///
/// Keys are the *catalog* `vendorCode`, which is not the endpoint-side name
/// (`bytedance` publishes `jimeng.*` for media, `kuaishou` publishes
/// `kling.*`). Keep both copies of this function in step (this one *writes* the
/// rows; the cloud router's copy *reads* them for `catalog_expectations`).
fn vendor_native_audio_descriptor(vendor_code: &str) -> Option<EndpointDescriptor> {
    let descriptor = match vendor_code {
        // ElevenLabs' speech synthesis surface. Transcription models
        // (`scribe_*`) are excluded before this table is consulted — see
        // `model_audio_endpoint_descriptor`.
        "elevenlabs" => EndpointDescriptor {
            endpoint_code: "elevenlabs.text_to_speech",
            protocol_code: "vendor_native",
            display_name: "ElevenLabs Text To Speech",
            method: "POST",
            path_template: "/v1/text-to-speech/{voice_id}",
            streaming_supported: true,
            sort_order: 410,
        },
        // Volcengine Ark's speech surface.
        "volcengine" => EndpointDescriptor {
            endpoint_code: "volcengine.speech",
            protocol_code: "vendor_native",
            display_name: "Volcengine Speech",
            method: "POST",
            path_template: "/api/v3/audio/speech",
            streaming_supported: true,
            sort_order: 420,
        },
        _ => return None,
    };
    Some(descriptor)
}

/// The vendor-native audio endpoint for a model, honouring both the model's
/// declared `apiFormat` and its catalog vendor code.
///
/// `apiFormat = "google_gemini"` is itself the native Gemini surface. Google's
/// audio models split into two kinds: the live/translate family, which the
/// classifier routes to `gemini.live` (`/v1beta/live/sessions`), and the plain
/// TTS family, for which the catalog publishes no native speech endpoint — so
/// the TTS family keeps `openai.audio` rather than being pointed at the live
/// session route it cannot speak.
///
/// **Transcription models are a deliberate exception.** `scribe_v2`,
/// `scribe_v2_medical`, `scribe_v2_realtime` and the Gemini `*-transcribe*`
/// models are `primaryCapability = "audio"` with `apiFormat = vendor_native`,
/// but they take audio *input* and emit text; the speech (synthesis) natives do
/// not answer them and the project declares no native transcription route. They
/// keep `openai.audio`, which the vendors' OpenAI-compatible surface does
/// answer.
fn model_audio_endpoint_descriptor(model: &ModelInfo) -> EndpointDescriptor {
    let openai_compatible_audio = || EndpointDescriptor {
        endpoint_code: "openai.audio",
        protocol_code: "openai_compatible",
        display_name: "OpenAI Audio",
        method: "POST",
        path_template: "/v1/audio",
        streaming_supported: true,
        sort_order: 40,
    };

    // `apiFormat = "google_gemini"` is itself the native Gemini surface. Of
    // Google's audio models only the live/translate family has a declared
    // native route (`gemini.live`, audio-in/audio-out); the plain TTS family has
    // none, so it keeps `openai.audio` rather than being pointed at a live
    // session route it cannot speak.
    if model.api_format == "google_gemini"
        && model.input_modalities.iter().any(|m| m == "audio")
        && model.output_modalities.iter().any(|m| m == "audio")
    {
        return EndpointDescriptor {
            endpoint_code: "gemini.live",
            protocol_code: "vendor_native",
            display_name: "Gemini Live Session",
            method: "POST",
            path_template: "/v1beta/live/sessions",
            streaming_supported: true,
            sort_order: 415,
        };
    }

    // A transcription model has audio *input* and text output; the speech
    // (synthesis) natives do not answer it.
    let is_transcription = model.output_modalities.iter().any(|m| m == "text")
        && model.input_modalities.iter().any(|m| m == "audio");
    if is_transcription {
        return openai_compatible_audio();
    }

    match vendor_native_audio_descriptor(model.vendor_code.trim()) {
        // A native endpoint exists *and* the model claims a native surface.
        Some(descriptor) if model.api_format == "vendor_native" => descriptor,
        // A native endpoint exists but the model is declared OpenAI-compatible:
        // the model's own declaration wins, because the request body it will
        // receive is the OpenAI one.
        _ => openai_compatible_audio(),
    }
}

/// The sound-effect endpoint for a model (音效).
///
/// Four sfx vendors (`kuaishou`, `stability_ai`, `vidu`, and the generic case)
/// each answer a different path, and all of them resolve onto the one
/// `sfx.sound` route so the capability has a single reachable endpoint code.
///
/// **`elevenlabs` is the exception.** Its classifier arms deliberately omit the
/// sfx routes: `/v1/sound-generation` classifies to
/// `elevenlabs.sound_generation`, which is the more specific code and must win.
/// Binding its sfx model to the generic `sfx.sound` would plan the call against
/// `/v1/sound/generate` — a path ElevenLabs answers with `elevenlabs.*` codes,
/// not `sfx.sound` — so the binding could never be honoured.
fn model_sfx_endpoint_descriptor(model: &ModelInfo) -> EndpointDescriptor {
    if model.api_format == "vendor_native" && model.vendor_code.trim() == "elevenlabs" {
        return EndpointDescriptor {
            endpoint_code: "elevenlabs.sound_generation",
            protocol_code: "vendor_native",
            display_name: "ElevenLabs Sound Generation",
            method: "POST",
            path_template: "/v1/sound-generation",
            streaming_supported: false,
            sort_order: 415,
        };
    }
    EndpointDescriptor {
        endpoint_code: "sfx.sound",
        protocol_code: "vendor_native",
        display_name: "Sound Effects",
        method: "POST",
        path_template: "/v1/sound/generate",
        streaming_supported: false,
        sort_order: 55,
    }
}

/// The music endpoint for a model.
///
/// Same defect as the image (§15.25), video (§15.26) and audio (§15.28) arms,
/// one capability later: `primaryCapability = "music"` was the only input, so
/// **all 15 active music bindings** — `elevenlabs/music_*`,
/// `google/lyria-*`, `mureka/*`, `stability_ai/stable-audio-*`,
/// `bytedance/seed-music-gensong-v4`, `minimax/music-cover` — collapsed onto
/// `suno.music`, a route owned by a vendor none of them are.
///
/// **`suno.music` is a compatibility surface, not a vendor endpoint.** Its
/// resource is `api.suno.music`, display name "Music Generation
/// (Suno-protocol)", and it is granted by `api.openai_compatible.all` (the
/// compat group) with `defaultBillingMeter = music_output_second` — same shape
/// as `openai.audio` / `openai.videos`. So models whose vendor publishes no
/// native music API legitimately stay there, which is the honest answer for
/// `elevenlabs`, `google`, `mureka`, `stability_ai` and `bytedance`.
///
/// The one vendor with a declared native music endpoint is `minimax`
/// (`minimax.music_generation`, `/v1/music/generations`, granted by
/// `official.minimax.music`) — and it had **zero** models bound. `suno` itself
/// is deliberately parked in the catalog (`lifecycle = catalog_only` /
/// `deprecated`, `shelfState = hidden`, `routingState = catalog_only`), so its
/// models are retired and bind nothing.
fn model_music_endpoint_descriptor(model: &ModelInfo) -> EndpointDescriptor {
    let suno_compatible_music = || EndpointDescriptor {
        endpoint_code: "suno.music",
        protocol_code: "vendor_native",
        display_name: "Suno Music",
        method: "POST",
        path_template: "/v1/music",
        streaming_supported: false,
        sort_order: 50,
    };

    // MiniMax publishes its own music surface; a model declaring
    // `vendor_native` must reach it rather than the Suno compatibility face.
    if model.api_format == "vendor_native" && model.vendor_code.trim() == "minimax" {
        return EndpointDescriptor {
            endpoint_code: "minimax.music_generation",
            protocol_code: "vendor_native",
            display_name: "MiniMax Music Generation",
            method: "POST",
            path_template: "/v1/music/generations",
            streaming_supported: false,
            sort_order: 430,
        };
    }

    suno_compatible_music()
}

fn model_endpoint_descriptor(model: &ModelInfo) -> EndpointDescriptor {
    match model.primary_capability.as_str() {
        "image" => model_image_endpoint_descriptor(model),
        "audio" => model_audio_endpoint_descriptor(model),
        "music" => model_music_endpoint_descriptor(model),
        // Sound effects.
        //
        // Without this arm `primaryCapability = "sfx"` falls through to the
        // generic chat branch below and every sfx model is bound to
        // `openai.chat_completions` — so a sound-effect request is replayed to
        // the vendor's *chat* surface and can never produce audio. The catalog
        // declares 10 sfx models across 4 vendors (`elevenlabs`, `kuaishou`,
        // `stability_ai`, `vidu`); this arm gives them their own endpoint so the
        // vendor-native classifier can reach `sound.generate`.
        "sfx" => model_sfx_endpoint_descriptor(model),
        "video" => model_video_endpoint_descriptor(model),
        "embedding" => EndpointDescriptor {
            endpoint_code: "openai.embeddings",
            protocol_code: "openai_compatible",
            display_name: "OpenAI Embeddings",
            method: "POST",
            path_template: "/v1/embeddings",
            streaming_supported: false,
            sort_order: 20,
        },
        "rerank" => EndpointDescriptor {
            endpoint_code: "rerank",
            protocol_code: "vendor_native",
            display_name: "Rerank",
            method: "POST",
            path_template: "/v1/rerank",
            streaming_supported: false,
            sort_order: 70,
        },
        _ if model.api_format == "openai_responses" => EndpointDescriptor {
            endpoint_code: "openai.chat_completions",
            protocol_code: "openai_compatible",
            display_name: "OpenAI Chat Completions",
            method: "POST",
            path_template: "/v1/chat/completions",
            streaming_supported: model.supports_streaming,
            sort_order: 10,
        },
        _ => EndpointDescriptor {
            endpoint_code: "openai.chat_completions",
            protocol_code: "openai_compatible",
            display_name: "OpenAI Chat Completions",
            method: "POST",
            path_template: "/v1/chat/completions",
            streaming_supported: model.supports_streaming,
            sort_order: 10,
        },
    }
}

fn model_modality_codes(model: &ModelInfo) -> BTreeSet<String> {
    model
        .input_modalities
        .iter()
        .chain(model.output_modalities.iter())
        .chain(std::iter::once(&model.primary_capability))
        .filter_map(|value| {
            let value = value.trim();
            if value.is_empty() {
                None
            } else {
                Some(value.to_owned())
            }
        })
        .collect()
}

fn model_endpoint_modalities(model: &ModelInfo) -> BTreeSet<String> {
    model
        .input_modalities
        .iter()
        .chain(model.output_modalities.iter())
        .chain(std::iter::once(&model.primary_capability))
        .filter_map(|value| {
            let value = value.trim();
            if value.is_empty() {
                None
            } else {
                Some(value.to_owned())
            }
        })
        .collect()
}

fn model_modality_directions(model: &ModelInfo) -> Vec<(String, String)> {
    let input = model
        .input_modalities
        .iter()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .collect::<BTreeSet<_>>();
    let output = model
        .output_modalities
        .iter()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .collect::<BTreeSet<_>>();
    input
        .union(&output)
        .map(|modality_code| {
            let direction = match (
                input.contains(modality_code),
                output.contains(modality_code),
            ) {
                (true, true) => "input_output",
                (true, false) => "input",
                (false, true) => "output",
                (false, false) => "input_output",
            };
            (modality_code.clone(), direction.to_owned())
        })
        .collect()
}

fn endpoint_vendor_code(endpoint_code: &str) -> Option<String> {
    endpoint_code
        .split_once('.')
        .map(|(vendor_code, _)| vendor_code.to_owned())
        .filter(|vendor_code| vendor_code != "rerank")
}

fn endpoint_modality_code(endpoint_code: &str) -> Option<String> {
    match endpoint_code {
        "openai.images" => Some("image"),
        "openai.audio" => Some("audio"),
        "suno.music" => Some("music"),
        "openai.video" => Some("video"),
        "openai.embeddings" => Some("embedding"),
        "rerank" => Some("rerank"),
        "openai.chat_completions" => Some("chat"),
        // Vendor-native endpoints whose code does not spell out the modality.
        // Without these the endpoint is still importable but the
        // `ai_modality_api_endpoint` projection loses the link, so the modality
        // view of the catalog under-reports which endpoints serve it.
        "gemini.image_generation" | "gemini.nano_banana.image_generation" => Some("image"),
        "jimeng.image_generation" | "kling.image_generation" | "volcengine.image_generation"
        | "vidu.reference_to_image" | "black_forest_labs.image_generation"
        | "runway.image_generation" | "stability_ai.image_generation" => Some("image"),
        "gemini.video_generation" | "jimeng.video_generation" | "volcengine.video_generation"
        | "kling.text_to_video" | "kling.image_to_video" | "kling.avatar"
        | "kling.motion_control" | "vidu.start_end_to_video" | "vidu.motion_sync" => Some("video"),
        "minimax.music_generation" | "suno.music_generation" => Some("music"),
        "elevenlabs.text_to_speech" | "volcengine.speech" => Some("audio"),
        "elevenlabs.sound_generation" | "sfx.sound" => Some("audio"),
        // Gemini's live/translate session surface is audio-in/audio-out.
        "gemini.live" => Some("audio"),
        "gemini.generate_content" | "gemini.stream_generate_content" | "anthropic.messages"
        | "anthropic.claude_code" => Some("chat"),
        "gemini.embed_content" => Some("embedding"),
        _ => None,
    }
    .map(str::to_owned)
}

fn modality_display_name(modality_code: &str) -> String {
    match modality_code {
        "llm" => "LLM",
        "text" => "Text",
        "chat" => "Chat",
        "image" => "Image",
        "audio" => "Audio",
        "music" => "Music",
        "video" => "Video",
        "embedding" => "Embedding",
        "rerank" => "Rerank",
        "tool" => "Tool",
        "storage" => "Storage",
        "network" => "Network",
        value => value,
    }
    .to_owned()
}

fn modality_group(modality_code: &str) -> &'static str {
    match modality_code {
        "llm" | "chat" | "text" | "embedding" | "rerank" => "language",
        "image" | "video" => "visual",
        "audio" | "music" => "audio",
        "tool" | "storage" | "network" => "tooling",
        _ => "custom",
    }
}

fn modality_description(modality_code: &str) -> String {
    format!("SDKWork model catalog {modality_code} modality")
}

fn modality_sort_order(modality_code: &str) -> Option<i32> {
    match modality_code {
        "llm" => Some(5),
        "chat" => Some(10),
        "text" => Some(20),
        "embedding" => Some(30),
        "image" => Some(40),
        "audio" => Some(50),
        "music" => Some(60),
        "video" => Some(70),
        "rerank" => Some(80),
        "tool" => Some(90),
        "storage" => Some(100),
        "network" => Some(110),
        _ => None,
    }
}

fn validate_catalog_version_pin(
    catalog: &ModelCatalog,
    catalog_version: Option<&str>,
) -> Result<(), CatalogImportError> {
    let Some(expected) = catalog_version
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return Ok(());
    };
    if expected != catalog.manifest.catalog_version {
        return Err(CatalogImportError::CatalogVersionMismatch {
            expected: expected.to_owned(),
            actual: catalog.manifest.catalog_version.clone(),
        });
    }
    Ok(())
}

fn normalized_vendor_set(vendor_codes: &[String]) -> BTreeSet<String> {
    vendor_codes
        .iter()
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty())
        .collect()
}

pub(crate) fn stable_uuid(prefix: &str, parts: &[&str]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prefix.as_bytes());
    for part in parts {
        hasher.update(b":");
        hasher.update(part.as_bytes());
    }
    let digest = format!("{:x}", hasher.finalize());
    // uuid columns are VARCHAR(64); trim the hex suffix so `{prefix}-` fits.
    let digest_chars = 40usize.min(64usize.saturating_sub(prefix.len() + 1));
    format!("{prefix}-{}", &digest[..digest_chars])
}

pub(crate) fn release_stage_code(value: &str) -> i32 {
    match value {
        "preview" => 2,
        "deprecated" => 3,
        "retired" => 4,
        _ => 1,
    }
}

pub(crate) fn shelf_state_code(value: &str) -> i32 {
    match value {
        "hidden" => 2,
        "archived" => 3,
        _ => 1,
    }
}

pub(crate) fn routing_state_code(value: &str) -> i32 {
    match value {
        "enabled" => 1,
        _ => 0,
    }
}

pub(crate) fn price_supplier_code(
    vendor_code: &str,
    _region_code: &str,
    price_side: &str,
    pricing_scope: Option<&str>,
) -> Option<String> {
    if price_side == "upstream" || matches!(pricing_scope, Some("provider" | "channel")) {
        Some(format!("{vendor_code}_direct"))
    } else {
        None
    }
}

pub(crate) fn model_modalities_json(model: &ModelInfo) -> String {
    let mut values = model.input_modalities.clone();
    for output in &model.output_modalities {
        if !values.contains(output) {
            values.push(output.clone());
        }
    }
    serde_json::to_string(&values).unwrap_or_else(|_| "[]".to_owned())
}

pub(crate) fn model_capabilities_json(model: &ModelInfo) -> String {
    let capabilities;
    let values = if model.capabilities.is_empty() {
        capabilities = vec![model.primary_capability.clone()];
        capabilities.as_slice()
    } else {
        model.capabilities.as_slice()
    };
    json_array(values)
}

pub(crate) fn json_array(values: &[String]) -> String {
    serde_json::to_string(values).unwrap_or_else(|_| "[]".to_owned())
}

pub(crate) struct BundledPricingDictionaryRows {
    pub vendors: Vec<crate::infrastructure::sql::rows::ModelVendorRow>,
    pub models: Vec<crate::infrastructure::sql::rows::AiModelRow>,
    pub prices: Vec<crate::infrastructure::sql::rows::ModelPriceRow>,
}

/// Merge the portable sdkwork-models dictionary with database-owned facts.
///
/// The bundled dictionary owns public catalog identities and official prices,
/// while the database may contain tenant-owned models, provider/channel costs,
/// customer prices, and other runtime overrides.  Keeping both sources in the
/// immutable snapshot is required for custom routes and margin calculation;
/// duplicate public facts are retained from the dictionary so a stale database
/// import cannot shadow the selected catalog version.
pub(crate) fn merge_runtime_pricing_dictionary_rows(
    mut dictionary: BundledPricingDictionaryRows,
    database_vendors: Vec<crate::infrastructure::sql::rows::ModelVendorRow>,
    database_models: Vec<crate::infrastructure::sql::rows::AiModelRow>,
    database_prices: Vec<crate::infrastructure::sql::rows::ModelPriceRow>,
) -> BundledPricingDictionaryRows {
    let mut vendor_codes = dictionary
        .vendors
        .iter()
        .map(|row| row.vendor_code.clone())
        .collect::<BTreeSet<_>>();
    dictionary.vendors.extend(
        database_vendors
            .into_iter()
            .filter(|row| vendor_codes.insert(row.vendor_code.clone())),
    );

    let mut model_keys = dictionary
        .models
        .iter()
        .map(|row| row.catalog_key.clone())
        .collect::<BTreeSet<_>>();
    dictionary.models.extend(
        database_models
            .into_iter()
            .filter(|row| model_keys.insert(row.catalog_key.clone())),
    );

    // Graft the database record identity onto matching bundled-dictionary
    // prices. The dictionary rows are built with `record_identity: None`, and
    // the dedupe below keeps the dictionary row (so a stale database import
    // cannot shadow the selected catalog version) — which strips the identity
    // the settlement guard requires for rated chargeable usage. The identity
    // is a database primary-key reference and is version-independent, so
    // injecting it does not override newer catalog content.
    let database_identity_by_key = database_prices
        .iter()
        .filter_map(|row| {
            let identity = row.rate_metadata.as_ref()?.record_identity.clone()?;
            Some((model_price_row_identity(row), identity))
        })
        .collect::<BTreeMap<_, _>>();
    for row in &mut dictionary.prices {
        let identity_key = model_price_row_identity(row);
        let Some(metadata) = row.rate_metadata.as_mut() else {
            continue;
        };
        if metadata.record_identity.is_some() {
            continue;
        }
        if let Some(identity) = database_identity_by_key.get(&identity_key) {
            metadata.record_identity = Some(identity.clone());
        }
    }

    let mut price_keys = dictionary
        .prices
        .iter()
        .map(model_price_row_identity)
        .collect::<BTreeSet<_>>();
    dictionary.prices.extend(
        database_prices
            .into_iter()
            .filter(|row| price_keys.insert(model_price_row_identity(row))),
    );

    dictionary
}
type ModelPriceRowIdentity = (
    i64,
    i64,
    String,
    String,
    String,
    String,
    Option<String>,
    Option<i64>,
    Option<String>,
    Option<String>,
);

fn model_price_row_identity(
    row: &crate::infrastructure::sql::rows::ModelPriceRow,
) -> ModelPriceRowIdentity {
    (
        row.tenant_id,
        row.organization_id,
        row.catalog_key.clone(),
        row.region_code.clone(),
        row.price_side_code.clone(),
        row.billing_meter_code.clone(),
        row.supplier_code.clone(),
        row.account_id,
        row.pricing_plan_code.clone(),
        row.rate_metadata
            .as_ref()
            .map(|metadata| metadata.rate_hash.clone()),
    )
}

pub(crate) fn bundled_pricing_dictionary_rows(
    catalog: &ModelCatalog,
) -> BundledPricingDictionaryRows {
    let mut vendors = Vec::new();
    let mut vendor_codes = BTreeSet::new();
    for record in catalog_vendor_records(catalog) {
        if vendor_codes.insert(record.vendor_code.clone()) {
            vendors.push(crate::infrastructure::sql::rows::ModelVendorRow {
                vendor_code: record.vendor_code,
                display_name: record.display_name,
            });
        }
    }

    let mut models = Vec::new();
    for (catalog_key, (_vendor, model)) in public_catalog_identity_models(catalog) {
        models.push(crate::infrastructure::sql::rows::AiModelRow {
            catalog_key,
            model: model.model_id.clone(),
            display_name: model.display_name.clone(),
            vendor_code: model.vendor_code.clone(),
            capabilities_json: model_capabilities_json(model),
            description: model.description.clone(),
            modalities_json: model_modalities_json(model),
            input_modalities_json: json_array(&model.input_modalities),
            output_modalities_json: json_array(&model.output_modalities),
            api_format: Some(model.api_format.clone()),
            capability_intro: None,
            limitations_json: "[]".to_owned(),
            supported_languages_json: "[]".to_owned(),
            use_cases_json: "[]".to_owned(),
            training_data_cutoff: None,
            context_tokens: model.context_tokens,
            max_output_tokens: model.max_output_tokens,
            supports_streaming: model.supports_streaming,
            supports_tools: model.supports_tools,
            supports_json_schema: model.supports_json_schema,
            usage_scopes_json: json_array(&model.usage_scopes),
            coding_visible: model.coding_visible,
            release_stage: Some(release_stage_code(&model.release_stage)),
            shelf_state: Some(shelf_state_code(&model.shelf_state)),
            routing_state: Some(routing_state_code(&model.routing_state)),
            replacement_model: model.replacement_model.clone(),
        });
    }

    let public_model_keys = public_catalog_identity_models(catalog)
        .keys()
        .cloned()
        .collect::<BTreeSet<_>>();
    let mut prices = Vec::new();
    for vendor in &catalog.vendors {
        for pricing in &vendor.pricing {
            let model_catalog_key = model_catalog_key(&pricing.vendor_code, &pricing.model_id);
            if !public_model_keys.contains(&model_catalog_key) {
                continue;
            }
            let pricing_catalog_key = pricing_catalog_key(&pricing.vendor_code, &pricing.model_id);
            for price in &pricing.prices {
                let Ok(minimum_quantity) =
                    crate::domain::DecimalValue::parse(&price.minimum_quantity)
                else {
                    continue;
                };
                let Ok(quantity_step) = price
                    .quantity_step
                    .as_deref()
                    .map(crate::domain::DecimalValue::parse)
                    .transpose()
                else {
                    continue;
                };
                let currency = price
                    .currency
                    .clone()
                    .unwrap_or_else(|| pricing.currency.clone());
                let Some(tiers) = price
                    .tiers
                    .iter()
                    .map(|tier| {
                        Some(crate::domain::PricingRateTier {
                            tier_code: tier.tier_code.clone(),
                            lower_bound: crate::domain::DecimalValue::parse(&tier.lower_bound)
                                .ok()?,
                            upper_bound: tier
                                .upper_bound
                                .as_deref()
                                .map(crate::domain::DecimalValue::parse)
                                .transpose()
                                .ok()?,
                            unit_size: crate::domain::DecimalValue::parse(&tier.unit_size).ok()?,
                            unit_price: crate::domain::Money::new(&currency, &tier.unit_price)
                                .ok()?,
                            flat_amount: crate::domain::Money::new(&currency, &tier.flat_amount)
                                .ok()?,
                        })
                    })
                    .collect::<Option<Vec<_>>>()
                else {
                    continue;
                };
                let formula = match price.formula.as_ref() {
                    Some(formula) => {
                        let Some(formula) = (|| {
                            Some(crate::domain::PricingFormula {
                                formula_code: formula.formula_code.clone(),
                                formula_version: formula.formula_version.clone(),
                                constant_units: crate::domain::DecimalValue::parse(
                                    &formula.constant_units,
                                )
                                .ok()?,
                                quantity_coefficient: crate::domain::DecimalValue::parse(
                                    &formula.quantity_coefficient,
                                )
                                .ok()?,
                                minimum_units: formula
                                    .minimum_units
                                    .as_deref()
                                    .map(crate::domain::DecimalValue::parse)
                                    .transpose()
                                    .ok()?,
                                maximum_units: formula
                                    .maximum_units
                                    .as_deref()
                                    .map(crate::domain::DecimalValue::parse)
                                    .transpose()
                                    .ok()?,
                                terms: formula
                                    .terms
                                    .iter()
                                    .map(|term| {
                                        Some(crate::domain::PricingFormulaTerm {
                                            term_code: term.term_code.clone(),
                                            dimension_code: term.dimension_code.clone(),
                                            coefficient: crate::domain::DecimalValue::parse(
                                                &term.coefficient,
                                            )
                                            .ok()?,
                                        })
                                    })
                                    .collect::<Option<Vec<_>>>()?,
                            })
                        })() else {
                            continue;
                        };
                        Some(formula)
                    }
                    None => None,
                };
                let Some(effective_from) = parse_pricing_effective_instant(&price.effective_from)
                else {
                    continue;
                };
                let effective_to = match price.effective_to.as_deref() {
                    Some(value) => {
                        let Some(value) = parse_pricing_effective_instant(value) else {
                            continue;
                        };
                        Some(value)
                    }
                    None => None,
                };
                let Some(rate_variant) =
                    crate::domain::PricingRateVariant::from_code(&price.rate_variant)
                else {
                    continue;
                };
                let schedule = match price.schedule.as_ref() {
                    Some(schedule) => {
                        let Some(schedule) = parse_bundled_pricing_schedule(schedule) else {
                            continue;
                        };
                        Some(schedule)
                    }
                    None => None,
                };
                prices.push(crate::infrastructure::sql::rows::ModelPriceRow {
                    tenant_id: 0,
                    organization_id: 0,
                    catalog_key: pricing_catalog_key.clone(),
                    model: pricing.model_id.clone(),
                    region_code: pricing.region_code.clone(),
                    price_side_code: bundled_price_side_label(&price.price_side),
                    billing_meter_code: price.meter_code.clone(),
                    unit_size: price.unit_size.clone(),
                    unit_price: price.unit_price.clone(),
                    currency,
                    supplier_code: price_supplier_code(
                        &pricing.vendor_code,
                        &pricing.region_code,
                        &price.price_side,
                        price.pricing_scope.as_deref(),
                    ),
                    account_id: None,
                    pricing_plan_code: None,
                    rate_metadata: Some(crate::domain::PricingRateMetadata {
                        record_identity: None,
                        price_book_code: price.price_book_code.clone(),
                        rate_hash: price.rate_hash.clone(),
                        product_code: price.product_code.clone(),
                        operation_code: price.operation_code.clone(),
                        billability: price.billability.clone(),
                        charge_timing: price.charge_timing.clone(),
                        calculation_mode: price.calculation_mode.clone(),
                        quantity_aggregation: price.quantity_aggregation.clone(),
                        minimum_quantity,
                        quantity_step,
                        priority: price.priority,
                        effective_from,
                        effective_to,
                        rate_variant,
                        schedule,
                        conditions: price
                            .conditions
                            .iter()
                            .map(|condition| crate::domain::PricingRateCondition {
                                dimension_code: condition.dimension_code.clone(),
                                operator_code: condition.operator.clone(),
                                value: condition.value.clone(),
                            })
                            .collect(),
                        tiers,
                        formula,
                    }),
                });
            }
        }
    }

    BundledPricingDictionaryRows {
        vendors,
        models,
        prices,
    }
}

fn parse_pricing_effective_instant(value: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(value.trim())
        .map(|value| value.with_timezone(&Utc))
        .ok()
        .or_else(|| {
            NaiveDate::parse_from_str(value.trim(), "%Y-%m-%d")
                .ok()
                .and_then(|date| date.and_hms_opt(0, 0, 0))
                .map(|value| value.and_utc())
        })
}

fn parse_bundled_pricing_schedule(
    schedule: &sdkwork_models::PriceSchedule,
) -> Option<crate::domain::PricingSchedule> {
    Some(crate::domain::PricingSchedule {
        time_zone: schedule.time_zone.parse().ok()?,
        weekly_windows: schedule
            .weekly_windows
            .iter()
            .map(|window| {
                Some(crate::domain::PricingWeeklyWindow {
                    window_code: window.window_code.clone(),
                    days_of_week: window.days_of_week.clone(),
                    start_time: NaiveTime::parse_from_str(&window.start_time, "%H:%M:%S").ok()?,
                    end_time: NaiveTime::parse_from_str(&window.end_time, "%H:%M:%S").ok()?,
                    end_day_offset: window.end_day_offset,
                })
            })
            .collect::<Option<Vec<_>>>()?,
        include_dates: schedule
            .include_dates
            .iter()
            .map(|value| NaiveDate::parse_from_str(value, "%Y-%m-%d").ok())
            .collect::<Option<Vec<_>>>()?,
        exclude_dates: schedule
            .exclude_dates
            .iter()
            .map(|value| NaiveDate::parse_from_str(value, "%Y-%m-%d").ok())
            .collect::<Option<Vec<_>>>()?,
    })
}

fn bundled_price_side_label(value: &str) -> String {
    match value {
        "upstream" => "upstream_cost".to_owned(),
        "customer" => "customer_charge".to_owned(),
        "internal" => "internal_transfer".to_owned(),
        _ => "official_reference".to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        endpoint_modality_code, merge_runtime_pricing_dictionary_rows, model_endpoint_descriptor,
        price_supplier_code, stable_uuid, ModelInfo,
    };
    use crate::domain::{PricingRateMetadata, PricingRateRecordIdentity};
    use crate::infrastructure::sql::rows::ModelPriceRow;

    fn metadata(
        rate_hash: &str,
        record_identity: Option<PricingRateRecordIdentity>,
    ) -> Option<PricingRateMetadata> {
        Some(PricingRateMetadata {
            record_identity,
            price_book_code: "models-deepseek-cn-cny-2026-08-15".to_owned(),
            rate_hash: rate_hash.to_owned(),
            product_code: "model-inference".to_owned(),
            operation_code: "chat-completions".to_owned(),
            billability: "chargeable".to_owned(),
            charge_timing: "postpaid".to_owned(),
            calculation_mode: "per_unit".to_owned(),
            quantity_aggregation: "sum".to_owned(),
            minimum_quantity: crate::domain::DecimalValue::parse("1").unwrap(),
            quantity_step: None,
            priority: 10,
            effective_from: chrono::Utc::now(),
            effective_to: None,
            rate_variant: crate::domain::PricingRateVariant::Standard,
            schedule: None,
            conditions: Vec::new(),
            tiers: Vec::new(),
            formula: None,
        })
    }

    fn price_row(
        catalog_key: &str,
        region_code: &str,
        rate_hash: &str,
        record_identity: Option<PricingRateRecordIdentity>,
    ) -> ModelPriceRow {
        ModelPriceRow {
            tenant_id: 0,
            organization_id: 0,
            catalog_key: catalog_key.to_owned(),
            model: catalog_key.to_owned(),
            region_code: region_code.to_owned(),
            price_side_code: "official_reference".to_owned(),
            billing_meter_code: "llm_input_token".to_owned(),
            unit_size: "1".to_owned(),
            unit_price: "0.020000".to_owned(),
            currency: "CNY".to_owned(),
            supplier_code: None,
            account_id: None,
            pricing_plan_code: None,
            rate_metadata: metadata(rate_hash, record_identity),
        }
    }

    fn dictionary(rows: Vec<ModelPriceRow>) -> super::BundledPricingDictionaryRows {
        super::BundledPricingDictionaryRows {
            vendors: Vec::new(),
            models: Vec::new(),
            prices: rows,
        }
    }

    /// A database row carrying a persisted rate identity must graft that
    /// identity onto the bundled-dictionary row with the same key, because
    /// the dedupe keeps the dictionary row (stale imports must not shadow the
    /// selected catalog version) and the settlement guard rejects rated
    /// chargeable usage whose rate lacks a persisted record identity.
    #[test]
    fn merge_grafts_database_record_identity_onto_matching_dictionary_rows() {
        let identity = PricingRateRecordIdentity {
            price_book_tenant_id: 1,
            price_book_organization_id: 2,
            price_book_id: 42,
            rate_id: 7001,
        };
        let merged = merge_runtime_pricing_dictionary_rows(
            dictionary(vec![price_row(
                "deepseek/deepseek-chat",
                "cn",
                "sha256:book",
                None,
            )]),
            Vec::new(),
            Vec::new(),
            vec![price_row(
                "deepseek/deepseek-chat",
                "cn",
                "sha256:book",
                Some(identity),
            )],
        );

        assert_eq!(1, merged.prices.len());
        assert_eq!(
            Some(identity),
            merged.prices[0]
                .rate_metadata
                .as_ref()
                .and_then(|metadata| metadata.record_identity),
            "dictionary row must inherit the persisted rate identity from the database row"
        );
    }

    /// Database rows with no dictionary counterpart are appended as-is, and a
    /// dictionary row whose key has no database counterpart keeps its
    /// `record_identity: None` (no fabricated identity).
    #[test]
    fn merge_keeps_database_only_rows_and_unmatched_dictionary_rows() {
        let identity = PricingRateRecordIdentity {
            price_book_tenant_id: 1,
            price_book_organization_id: 2,
            price_book_id: 42,
            rate_id: 7002,
        };
        let merged = merge_runtime_pricing_dictionary_rows(
            dictionary(vec![price_row(
                "deepseek/deepseek-chat",
                "cn",
                "sha256:book",
                None,
            )]),
            Vec::new(),
            Vec::new(),
            vec![
                price_row(
                    "deepseek/deepseek-chat",
                    "cn",
                    "sha256:book",
                    Some(identity),
                ),
                price_row(
                    "tenant/custom-model",
                    "cn",
                    "sha256:tenant-row",
                    Some(identity),
                ),
            ],
        );

        assert_eq!(
            2,
            merged.prices.len(),
            "database-only rows must be appended alongside the dictionary rows"
        );
        assert_eq!(
            Some(identity),
            merged.prices[0]
                .rate_metadata
                .as_ref()
                .and_then(|metadata| metadata.record_identity),
            "matching database row still grafts its identity onto the dictionary row"
        );
        assert!(
            merged.prices.iter().any(|row| {
                row.catalog_key == "tenant/custom-model"
                    && row
                        .rate_metadata
                        .as_ref()
                        .and_then(|metadata| metadata.record_identity)
                        == Some(identity)
            }),
            "database-only rows keep their persisted identity"
        );
    }

    #[test]
    fn price_supplier_code_keeps_vendor_identity_separate_from_region() {
        assert_eq!(
            Some("minimax_direct".to_owned()),
            price_supplier_code("minimax", "cn", "upstream", None)
        );
        assert_eq!(
            Some("minimax_direct".to_owned()),
            price_supplier_code("minimax", "global", "official", Some("provider"))
        );
        assert_eq!(
            Some("kuaishou_direct".to_owned()),
            price_supplier_code("kuaishou", "global", "official", Some("channel"))
        );
        assert_eq!(
            None,
            price_supplier_code("minimax", "cn", "official", Some("model"))
        );
    }

    #[test]
    fn stable_uuid_always_fits_varchar_64_uuid_columns() {
        for prefix in [
            "pricing-import",
            "pricing-product",
            "pricing-operation",
            "pricing-meter",
            "pricing-book",
            "pricing-binding",
            "pricing-rate",
            "pricing-rate-binding",
            "pricing-condition",
            "pricing-rate-tier",
            "pricing-rate-formula",
            "pricing-rate-formula-term",
            "cloudrouter-pricing-plan",
            "cloudrouter-pricing-rule",
            "cloudrouter-account-group-rate-card",
            "payments-provider-update",
        ] {
            let uuid = stable_uuid(prefix, &["scope", "standard"]);
            assert!(
                uuid.len() <= 64,
                "{prefix} produced {}-char uuid",
                uuid.len()
            );
        }
    }
    /// Every capability the catalog declares must land on a descriptor that can
    /// actually carry it.
    ///
    /// This pins the defect that let sound effects be routed as chat: with no
    /// `"sfx"` arm in `model_endpoint_descriptor`, `primaryCapability = "sfx"`
    /// fell through to the generic chat branch, so every
    /// `stability_ai/stable-audio-2.5-sfx` request would have been replayed to
    /// the vendor's `/v1/chat/completions`. A capability silently sharing the
    /// chat endpoint is indistinguishable from an LLM at import time, which is
    /// why the assertion is on the endpoint code and not on a capability enum.
    #[test]
    fn each_media_capability_binds_to_its_own_endpoint_not_chat() {
        // Built through serde rather than a field list: `ModelInfo` is an
        // external SDK type with ~30 fields, and transcribing them here would
        // make this guard fail to compile every time the SDK grows a field —
        // obscuring the one thing it is meant to assert.
        let model_of = |capability: &str| -> ModelInfo {
            serde_json::from_value(serde_json::json!({
                "catalogKey": "test/model",
                "modelId": "model",
                "displayName": "Test Model",
                "vendorCode": "test",
                "regionCode": "global",
                "familyCode": "test",
                "primaryCapability": capability,
                "apiFormat": "openai_compatible",
                "lifecycle": "active",
                "releaseStage": "active",
                "shelfState": "listed",
                "routingState": "enabled",
                "source": { "sourceUrl": "https://example.test/models", "observedAt": "2026-01-01T00:00:00Z" },
            }))
            .expect("test model must deserialize")
        };

        // Capabilities with a dedicated descriptor. `chat` is the fallback, so
        // it is asserted separately below.
        for (capability, expected) in [
            ("image", "openai.images"),
            ("audio", "openai.audio"),
            ("music", "suno.music"),
            ("video", "openai.video"),
            ("embedding", "openai.embeddings"),
            ("rerank", "rerank"),
            ("sfx", "sfx.sound"),
        ] {
            let descriptor = model_endpoint_descriptor(&model_of(capability));
            assert_eq!(
                descriptor.endpoint_code, expected,
                "capability {capability} bound to {} instead of {expected}",
                descriptor.endpoint_code
            );
        }

        // `chat` is what the fallback produces, and it must still do so.
        assert_eq!(
            model_endpoint_descriptor(&model_of("chat")).endpoint_code,
            "openai.chat_completions"
        );
        // An unknown capability falls back to chat by design.
        assert_eq!(
            model_endpoint_descriptor(&model_of("something-new")).endpoint_code,
            "openai.chat_completions"
        );

        // Regressions that matter most: no media capability may be chat.
        for capability in ["image", "audio", "music", "video", "embedding", "sfx"] {
            assert_ne!(
                model_endpoint_descriptor(&model_of(capability)).endpoint_code,
                "openai.chat_completions",
                "capability {capability} collapsed onto the chat endpoint"
            );
        }
    }

    /// An image model must be bound to *its own vendor's* image surface, not to
    /// whichever vendor happened to define the generic one.
    ///
    /// Pins the second half of the same defect: `primaryCapability = "image"`
    /// was the only input, so all 49 bound image models — including the 42 whose
    /// `apiFormat` says `vendor_native` — collapsed onto `openai.images`. A
    /// `google/gemini-3-pro-image` request was therefore planned against an
    /// OpenAI-compatible route while `provider_native_classifier` would have
    /// replayed it to `/v1beta/models/{model}:generateImages`; the two halves of
    /// the chain disagreed about which `api_code` an image request carries.
    #[test]
    fn image_models_bind_to_their_vendor_native_endpoint() {
        let image_model_of =
            |vendor_code: &str, api_format: &str, model_id: &str| -> ModelInfo {
                serde_json::from_value(serde_json::json!({
                    "catalogKey": format!("{vendor_code}/{model_id}"),
                    "modelId": model_id,
                    "displayName": "Test Image Model",
                    "vendorCode": vendor_code,
                    "regionCode": "global",
                    "familyCode": "test",
                    "primaryCapability": "image",
                    "apiFormat": api_format,
                    "lifecycle": "active",
                    "releaseStage": "active",
                    "shelfState": "listed",
                    "routingState": "enabled",
                    "source": { "sourceUrl": "https://example.test/models", "observedAt": "2026-01-01T00:00:00Z" },
                }))
                .expect("test image model must deserialize")
            };

        // Catalog vendor code -> the native endpoint its image models must use.
        for (vendor_code, expected) in [
            ("google", "gemini.image_generation"),
            ("bytedance", "jimeng.image_generation"),
            ("kuaishou", "kling.image_generation"),
            ("volcengine", "volcengine.image_generation"),
            ("vidu", "vidu.reference_to_image"),
            ("black_forest_labs", "black_forest_labs.image_generation"),
            ("runway", "runway.image_generation"),
            ("stability_ai", "stability_ai.image_generation"),
        ] {
            let descriptor = model_endpoint_descriptor(&image_model_of(
                vendor_code,
                "vendor_native",
                "test-image",
            ));
            assert_eq!(
                descriptor.endpoint_code, expected,
                "vendor {vendor_code} image model bound to {} instead of {expected}",
                descriptor.endpoint_code
            );
            assert_eq!(
                descriptor.protocol_code, "vendor_native",
                "vendor {vendor_code} bound to a non-native protocol"
            );
        }

        // `apiFormat = "google_gemini"` is itself the native Gemini surface, so
        // it must reach `gemini.image_generation` regardless of the vendor code
        // spelling used by the catalog.
        for vendor_spelling in ["google", "gemini"] {
            assert_eq!(
                model_endpoint_descriptor(&image_model_of(
                    vendor_spelling,
                    "google_gemini",
                    "gemini-3-pro-image"
                ))
                .endpoint_code,
                "gemini.image_generation",
                "apiFormat google_gemini must reach the native Gemini endpoint"
            );
        }

        // A vendor with no declared native image API keeps the generic surface:
        // sending it to a native route the vendor never registered would plan
        // against a non-existent endpoint.
        for vendor_code in ["openai", "xai", "zhipu", "minimax", "alibaba"] {
            assert_eq!(
                model_endpoint_descriptor(&image_model_of(
                    vendor_code,
                    "vendor_native",
                    "test-image"
                ))
                .endpoint_code,
                "openai.images",
                "vendor {vendor_code} has no native image endpoint and must stay generic"
            );
        }

        // A model that declares an OpenAI-compatible image surface must keep it
        // even when its vendor does publish a native one: the request body it
        // will receive is the OpenAI one.
        for vendor_code in [
            "google",
            "bytedance",
            "kuaishou",
            "volcengine",
            "vidu",
            "black_forest_labs",
            "runway",
            "stability_ai",
        ] {
            assert_eq!(
                model_endpoint_descriptor(&image_model_of(
                    vendor_code,
                    "openai_compatible",
                    "test-image"
                ))
                .endpoint_code,
                "openai.images",
                "vendor {vendor_code} declared openai_compatible and must not be forced native"
            );
        }
    }

    /// A video model must be bound to *its own vendor's* video surface, not to
    /// whichever vendor happened to define the generic one.
    ///
    /// Pins the video half of the same defect the image guard covers:
    /// `primaryCapability = "video"` was the only input, so all 60 active video
    /// bindings — including the 55 whose `apiFormat` says `vendor_native` —
    /// collapsed onto `openai.video` (`POST /v1/videos`). The bundled catalog
    /// had already declared nine native video endpoints and
    /// `provider_native_classifier` already routed their paths, but with zero
    /// `ai_model_api_endpoint` rows no video model could ever reach them.
    #[test]
    fn video_models_bind_to_their_vendor_native_endpoint() {
        let video_model_of =
            |vendor_code: &str, api_format: &str, model_id: &str| -> ModelInfo {
                serde_json::from_value(serde_json::json!({
                    "catalogKey": format!("{vendor_code}/{model_id}"),
                    "modelId": model_id,
                    "displayName": "Test Video Model",
                    "vendorCode": vendor_code,
                    "regionCode": "global",
                    "familyCode": "test",
                    "primaryCapability": "video",
                    "apiFormat": api_format,
                    "lifecycle": "active",
                    "releaseStage": "active",
                    "shelfState": "listed",
                    "routingState": "enabled",
                    "source": { "sourceUrl": "https://example.test/models", "observedAt": "2026-01-01T00:00:00Z" },
                }))
                .expect("test video model must deserialize")
            };

        // Catalog vendor code -> the native endpoint its video models must use.
        for (vendor_code, expected) in [
            ("google", "gemini.video_generation"),
            ("kuaishou", "kling.text_to_video"),
            ("bytedance", "jimeng.video_generation"),
            ("volcengine", "volcengine.video_generation"),
            ("vidu", "vidu.start_end_to_video"),
        ] {
            let descriptor = model_endpoint_descriptor(&video_model_of(
                vendor_code,
                "vendor_native",
                "test-video",
            ));
            assert_eq!(
                descriptor.endpoint_code, expected,
                "vendor {vendor_code} video model bound to {} instead of {expected}",
                descriptor.endpoint_code
            );
            assert_eq!(
                descriptor.protocol_code, "vendor_native",
                "vendor {vendor_code} bound to a non-native protocol"
            );
        }

        // `apiFormat = "google_gemini"` is itself the native Gemini surface, so
        // a Veo model must reach `gemini.video_generation` regardless of the
        // vendor code spelling used by the catalog.
        for vendor_spelling in ["google", "gemini"] {
            assert_eq!(
                model_endpoint_descriptor(&video_model_of(
                    vendor_spelling,
                    "google_gemini",
                    "veo-3.1-generate-preview"
                ))
                .endpoint_code,
                "gemini.video_generation",
                "apiFormat google_gemini must reach the native Gemini video endpoint"
            );
        }

        // A vendor with no declared native video API keeps the generic surface:
        // sending it to a native route the vendor never registered would plan
        // against a non-existent endpoint.
        for vendor_code in [
            "alibaba",
            "black_forest_labs",
            "luma_ai",
            "minimax",
            "pixverse",
            "runway",
            "zhipu",
            "openai",
            "xai",
        ] {
            assert_eq!(
                model_endpoint_descriptor(&video_model_of(
                    vendor_code,
                    "vendor_native",
                    "test-video"
                ))
                .endpoint_code,
                "openai.video",
                "vendor {vendor_code} has no native video endpoint and must stay generic"
            );
        }

        // A model that declares an OpenAI-compatible video surface must keep it
        // even when its vendor does publish a native one: the request body it
        // will receive is the OpenAI one.
        for vendor_code in ["google", "kuaishou", "bytedance", "volcengine", "vidu"] {
            assert_eq!(
                model_endpoint_descriptor(&video_model_of(
                    vendor_code,
                    "openai_compatible",
                    "test-video"
                ))
                .endpoint_code,
                "openai.video",
                "vendor {vendor_code} declared openai_compatible and must not be forced native"
            );
        }

        // The native video endpoints must resolve to the `video` modality, so
        // the `ai_modality_api_endpoint` projection keeps the link.
        for endpoint_code in [
            "gemini.video_generation",
            "kling.text_to_video",
            "kling.image_to_video",
            "kling.avatar",
            "kling.motion_control",
            "jimeng.video_generation",
            "volcengine.video_generation",
            "vidu.start_end_to_video",
            "vidu.motion_sync",
        ] {
            assert_eq!(
                endpoint_modality_code(endpoint_code).as_deref(),
                Some("video"),
                "endpoint {endpoint_code} must map to the video modality"
            );
        }
    }

    /// An audio model must be bound to *its own vendor's* audio surface, not to
    /// whichever vendor happened to define the generic one.
    ///
    /// Pins the audio half of the same defect the image and video guards cover:
    /// `primaryCapability = "audio"` was the only input, so all 40 bound audio
    /// models — including the 14 whose `apiFormat` says `vendor_native` —
    /// collapsed onto `openai.audio` (`POST /v1/audio`). Two declared native
    /// audio endpoints (`elevenlabs.text_to_speech`, `volcengine.speech`) had
    /// **zero** models bound to them, and an ElevenLabs TTS call was planned
    /// against a path the classifier can never classify for that vendor.
    #[test]
    fn audio_models_bind_to_their_vendor_native_endpoint() {
        let audio_model_of = |vendor_code: &str,
                              api_format: &str,
                              model_id: &str,
                              input_modalities: &[&str],
                              output_modalities: &[&str]|
         -> ModelInfo {
            serde_json::from_value(serde_json::json!({
                "catalogKey": format!("{vendor_code}/{model_id}"),
                "modelId": model_id,
                "displayName": "Test Audio Model",
                "vendorCode": vendor_code,
                "regionCode": "global",
                "familyCode": "test",
                "primaryCapability": "audio",
                "apiFormat": api_format,
                "inputModalities": input_modalities,
                "outputModalities": output_modalities,
                "lifecycle": "active",
                "releaseStage": "active",
                "shelfState": "listed",
                "routingState": "enabled",
                "source": { "sourceUrl": "https://example.test/models", "observedAt": "2026-01-01T00:00:00Z" },
            }))
            .expect("test audio model must deserialize")
        };

        // Catalog vendor code -> the native endpoint its speech models must use.
        for (vendor_code, expected) in [
            ("elevenlabs", "elevenlabs.text_to_speech"),
            ("volcengine", "volcengine.speech"),
        ] {
            let descriptor = model_endpoint_descriptor(&audio_model_of(
                vendor_code,
                "vendor_native",
                "test-tts",
                &["text"],
                &["audio"],
            ));
            assert_eq!(
                descriptor.endpoint_code, expected,
                "vendor {vendor_code} audio model bound to {} instead of {expected}",
                descriptor.endpoint_code
            );
            assert_eq!(
                descriptor.protocol_code, "vendor_native",
                "vendor {vendor_code} bound to a non-native protocol"
            );
        }

        // A vendor with no declared native audio API keeps the generic surface:
        // sending it to a native route the vendor never registered would plan
        // against a non-existent endpoint. `minimax` / `bytedance` publish
        // OpenAI-compatible audio surfaces and the project declares no native
        // audio endpoint for them.
        for vendor_code in [
            "minimax",
            "bytedance",
            "openai",
            "xiaomi",
            "mureka",
            "google",
        ] {
            assert_eq!(
                model_endpoint_descriptor(&audio_model_of(
                    vendor_code,
                    "vendor_native",
                    "test-tts",
                    &["text"],
                    &["audio"],
                ))
                .endpoint_code,
                "openai.audio",
                "vendor {vendor_code} has no native audio endpoint and must stay generic"
            );
        }

        // A model that declares an OpenAI-compatible audio surface must keep it
        // even when its vendor does publish a native one: the request body it
        // will receive is the OpenAI one.
        for vendor_code in ["elevenlabs", "volcengine"] {
            assert_eq!(
                model_endpoint_descriptor(&audio_model_of(
                    vendor_code,
                    "openai_compatible",
                    "test-tts",
                    &["text"],
                    &["audio"],
                ))
                .endpoint_code,
                "openai.audio",
                "vendor {vendor_code} declared openai_compatible and must not be forced native"
            );
        }

        // Transcription takes audio *in* and emits text: the speech (synthesis)
        // natives do not answer it, and the project declares no native
        // transcription route, so it stays on the OpenAI-compatible surface.
        for vendor_code in ["elevenlabs", "google", "openai"] {
            assert_eq!(
                model_endpoint_descriptor(&audio_model_of(
                    vendor_code,
                    "vendor_native",
                    "test-asr",
                    &["audio"],
                    &["text"],
                ))
                .endpoint_code,
                "openai.audio",
                "transcription model of {vendor_code} must not bind to a synthesis endpoint"
            );
        }

        // Gemini's live/translate family is the one Google audio surface the
        // catalog declares natively; it answers audio-in/audio-out.
        assert_eq!(
            model_endpoint_descriptor(&audio_model_of(
                "google",
                "google_gemini",
                "gemini-3.5-live-translate-preview",
                &["audio"],
                &["audio"],
            ))
            .endpoint_code,
            "gemini.live",
            "Gemini live/translate must reach the declared native live session route"
        );

        // ElevenLabs keeps its own two native surfaces; a sound-effect model
        // must not be flattened onto the generic `sfx.sound`, because
        // ElevenLabs answers `/v1/sound-generation` with `elevenlabs.*` codes.
        let sfx_model_of = |vendor_code: &str| -> ModelInfo {
            serde_json::from_value(serde_json::json!({
                "catalogKey": format!("{vendor_code}/test-sfx"),
                "modelId": "test-sfx",
                "displayName": "Test Sfx Model",
                "vendorCode": vendor_code,
                "regionCode": "global",
                "familyCode": "test",
                "primaryCapability": "sfx",
                "apiFormat": "vendor_native",
                "lifecycle": "active",
                "releaseStage": "active",
                "shelfState": "listed",
                "routingState": "enabled",
                "source": { "sourceUrl": "https://example.test/models", "observedAt": "2026-01-01T00:00:00Z" },
            }))
            .expect("test sfx model must deserialize")
        };
        assert_eq!(
            model_endpoint_descriptor(&sfx_model_of("elevenlabs")).endpoint_code,
            "elevenlabs.sound_generation",
            "elevenlabs sfx model must keep its own native sound-generation route"
        );
        for vendor_code in ["kuaishou", "stability_ai", "vidu"] {
            assert_eq!(
                model_endpoint_descriptor(&sfx_model_of(vendor_code)).endpoint_code,
                "sfx.sound",
                "vendor {vendor_code} sfx model must resolve onto the single sfx.sound route"
            );
        }

        // The native audio endpoints must resolve to the `audio` modality, so
        // the `ai_modality_api_endpoint` projection keeps the link.
        for endpoint_code in [
            "elevenlabs.text_to_speech",
            "volcengine.speech",
            "elevenlabs.sound_generation",
            "sfx.sound",
            "gemini.live",
            "openai.audio",
        ] {
            assert_eq!(
                endpoint_modality_code(endpoint_code).as_deref(),
                Some("audio"),
                "endpoint {endpoint_code} must map to the audio modality"
            );
        }
    }

    /// A music model must reach its own vendor's music surface when that vendor
    /// publishes one, and the Suno-protocol compatibility face otherwise.
    ///
    /// Pins the music half of the same collapse the image / video / audio guards
    /// cover: all 15 active music bindings landed on `suno.music`, including the
    /// models of `elevenlabs`, `google`, `mureka`, `stability_ai`, `bytedance`
    /// and `minimax` — while `minimax.music_generation`, the one declared native
    /// music endpoint, had zero bound models.
    #[test]
    fn music_models_bind_to_their_vendor_native_endpoint() {
        let music_model_of = |vendor_code: &str, api_format: &str| -> ModelInfo {
            serde_json::from_value(serde_json::json!({
                "catalogKey": format!("{vendor_code}/test-music"),
                "modelId": "test-music",
                "displayName": "Test Music Model",
                "vendorCode": vendor_code,
                "regionCode": "global",
                "familyCode": "test",
                "primaryCapability": "music",
                "apiFormat": api_format,
                "inputModalities": ["text"],
                "outputModalities": ["audio"],
                "lifecycle": "active",
                "releaseStage": "active",
                "shelfState": "listed",
                "routingState": "enabled",
                "source": { "sourceUrl": "https://example.test/models", "observedAt": "2026-01-01T00:00:00Z" },
            }))
            .expect("test music model must deserialize")
        };

        // MiniMax publishes the only declared native music endpoint.
        let minimax = model_endpoint_descriptor(&music_model_of("minimax", "vendor_native"));
        assert_eq!(
            minimax.endpoint_code, "minimax.music_generation",
            "minimax music model must reach its own native music route"
        );
        assert_eq!(minimax.protocol_code, "vendor_native");

        // Every other music vendor has no declared native music API, so the
        // Suno-protocol compatibility face is the honest answer. Pointing them
        // at a native route their vendor never registered would plan against a
        // non-existent endpoint.
        for vendor_code in [
            "elevenlabs",
            "google",
            "mureka",
            "stability_ai",
            "bytedance",
            "suno",
            "openai",
        ] {
            assert_eq!(
                model_endpoint_descriptor(&music_model_of(vendor_code, "vendor_native"))
                    .endpoint_code,
                "suno.music",
                "vendor {vendor_code} has no native music endpoint and must stay on the Suno-protocol face"
            );
        }

        // A MiniMax model that declares an OpenAI-compatible surface keeps it:
        // the request body it will receive is the OpenAI one.
        assert_eq!(
            model_endpoint_descriptor(&music_model_of("minimax", "openai_compatible")).endpoint_code,
            "suno.music",
            "minimax declared openai_compatible and must not be forced native"
        );

        // Both music routes must resolve to the `music` modality.
        for endpoint_code in ["suno.music", "minimax.music_generation"] {
            assert_eq!(
                endpoint_modality_code(endpoint_code).as_deref(),
                Some("music"),
                "endpoint {endpoint_code} must map to the music modality"
            );
        }
    }

    /// The closure invariant behind the five per-capability guards above.
    ///
    /// Every one of those guards enumerates the vendors it knows about by hand.
    /// That is what let the same defect (one generic endpoint per capability,
    /// chosen without looking at `apiFormat` or `vendor_code`) survive five
    /// times: a hand-written list only covers the vendors its author thought
    /// of, and a *new* catalog vendor silently rejoins the generic face until
    /// somebody notices.
    ///
    /// This test closes the space instead of enumerating it. It sweeps every
    /// `(vendor_code, api_format, capability)` combination the catalog can
    /// carry, runs each through `model_endpoint_descriptor`, and asserts two
    /// things about the result:
    ///
    ///   1. **No invented route.** Every `vendor_native` descriptor it produces
    ///      must be one the project has actually declared — same `endpoint_code`
    ///      *and* same `path_template` as an entry in
    ///      `data/ai-routing/resources/vendor-native-resources.json` (mirrored
    ///      below in [`DECLARED_VENDOR_NATIVE_ENDPOINTS`]). A descriptor naming
    ///      a path no resource declares is an orphan route: bound in the
    ///      catalog, but with no resource, no group grant, no classifier arm and
    ///      no price, so routing answers `50201` for it.
    ///
    ///   2. **Every emitted api code maps to a modality.** `endpoint_modality_code`
    ///      is what the accounting side reads to pick the meter; an endpoint it
    ///      cannot name falls through to the generic media meter.
    ///
    /// The declared set is a copy of the resource file rather than a read of it:
    /// this module has no filesystem access at test time in every build
    /// configuration, so the copy is the honest spelling. It is checked against
    /// nothing, which is exactly why the assertion is written the other way
    /// round — the *descriptor* is the thing under test, and the copy is the
    /// contract it must not exceed.
    #[test]
    fn every_capability_binds_only_to_a_declared_vendor_native_endpoint() {
        /// `(endpoint_code, path_template)` of every `api_endpoint` the project
        /// declares in `data/ai-routing/resources/vendor-native-resources.json`.
        ///
        /// Keep in step with that file: a resource added there without a line
        /// here makes this test wrongly strict (a legitimate native binding
        /// reported as invented), and a line added here without a resource
        /// makes it wrongly lenient. Both are visible the moment either file
        /// changes, which is the point.
        const DECLARED_VENDOR_NATIVE_ENDPOINTS: &[(&str, &str)] = &[
            ("anthropic.claude_code", "/v1/claude-code/sessions"),
            ("anthropic.messages", "/v1/messages"),
            ("black_forest_labs.image_generation", "/v1/flux-{model}"),
            ("black_forest_labs.task_query", "/v1/get_result"),
            ("elevenlabs.sound_generation", "/v1/sound-generation"),
            ("elevenlabs.text_to_speech", "/v1/text-to-speech/{voice_id}"),
            ("gemini.embed_content", "/v1beta/models/{model}:embedContent"),
            ("gemini.generate_content", "/v1beta/models/{model}:generateContent"),
            ("gemini.image_generation", "/v1beta/models/{model}:generateImages"),
            ("gemini.live", "/v1beta/live/sessions"),
            (
                "gemini.nano_banana.image_generation",
                "/v1beta/models/nano-banana:generateImages",
            ),
            (
                "gemini.stream_generate_content",
                "/v1beta/models/{model}:streamGenerateContent",
            ),
            ("gemini.video_generation", "/v1beta/models/{model}:generateVideos"),
            ("jimeng.image_generation", "/v1/images/generations"),
            ("jimeng.task_query", "/v1/tasks/{taskId}"),
            ("jimeng.video_generation", "/v1/videos/generations"),
            ("kling.avatar", "/v1/videos/avatar"),
            ("kling.image_generation", "/v1/images/generations"),
            ("kling.image_to_video", "/v1/videos/image2video"),
            ("kling.motion_control", "/v1/videos/motion-control"),
            ("kling.task_query", "/v1/videos/generations/{taskId}"),
            ("kling.text_to_video", "/v1/videos/text2video"),
            ("minimax.music_generation", "/v1/music/generations"),
            ("runway.image_generation", "/v1/text_to_image"),
            ("runway.task_query", "/v1/tasks/{id}"),
            ("sfx.sound", "/v1/sound/generate"),
            (
                "stability_ai.image_generation",
                "/v2beta/stable-image/generate/{mode}",
            ),
            ("suno.music", "/v1/music"),
            ("suno.music_generation", "/v1/music/generations"),
            ("suno.music_task_query", "/v1/music/generations/{taskId}"),
            ("vidu.motion_sync", "/ent/v2/template"),
            ("vidu.reference_to_image", "/ent/v2/reference2image"),
            ("vidu.start_end_to_video", "/ent/v2/start-end2video"),
            ("volcengine.image_generation", "/api/v3/images/generations"),
            ("volcengine.speech", "/api/v3/audio/speech"),
            (
                "volcengine.task_query",
                "/api/v3/contents/generations/tasks/{taskId}",
            ),
            (
                "volcengine.video_generation",
                "/api/v3/contents/generations/tasks",
            ),
        ];

        // The generic, non-vendor faces. They are `openai_compatible` rather
        // than `vendor_native`, so they are outside the declared set above, but
        // they still have to map to a modality.
        const GENERIC_ENDPOINTS: &[&str] = &[
            "openai.images",
            "openai.video",
            "openai.audio",
            "openai.embeddings",
            "openai.chat_completions",
            "rerank",
        ];

        // Every `vendorCode` the catalog ships (25), using the *catalog* spelling
        // — `google` / `kuaishou` / `bytedance`, not the endpoint-side
        // `gemini` / `kling` / `jimeng`. Both spellings are swept for the three
        // renamed vendors, because `provider_native_classifier` accepts either
        // and the descriptor tables match on the catalog name.
        const CATALOG_VENDORS: &[&str] = &[
            "alibaba",
            "anthropic",
            "baidu",
            "black_forest_labs",
            "bytedance",
            "deepseek",
            "elevenlabs",
            "google",
            "kuaishou",
            "luma_ai",
            "meituan",
            "minimax",
            "moonshot",
            "mureka",
            "openai",
            "pixverse",
            "runway",
            "stability_ai",
            "stepfun",
            "suno",
            "tencent",
            "vidu",
            "volcengine",
            "xai",
            "xiaomi",
            "zhipu",
        ];

        // The endpoint-side aliases of the three renamed vendors, so the sweep
        // covers the spellings `provider_native_classifier` also accepts.
        const VENDOR_ALIASES: &[&str] = &["gemini", "kling", "jimeng"];

        // `google_gemini` is the one apiFormat that is itself a native surface;
        // `vendor_native` is the general native claim; `openai_compatible` is
        // the counter-case that must never be forced native. All three are
        // swept for every vendor, so the three-way interaction is covered.
        const API_FORMATS: &[&str] = &["vendor_native", "google_gemini", "openai_compatible"];

        // Capabilities whose descriptor arm can return a `vendor_native`
        // endpoint. `embedding` / `rerank` / `llm` stay generic by design.
        const NATIVE_CAPABILITIES: &[(&str, &[&str], &[&str])] = &[
            ("image", &["text"], &["image"]),
            ("video", &["text"], &["video"]),
            ("audio", &["text"], &["audio"]),
            ("audio", &["audio"], &["text"]),
            ("audio", &["audio"], &["audio"]),
            ("music", &["text"], &["audio"]),
            ("sfx", &["text"], &["audio"]),
        ];

        let declared: Vec<(&str, &str)> = DECLARED_VENDOR_NATIVE_ENDPOINTS.to_vec();
        let known_endpoint_codes: Vec<&str> = declared
            .iter()
            .map(|(code, _)| *code)
            .chain(GENERIC_ENDPOINTS.iter().copied())
            .collect();

        let model_of = |vendor_code: &str,
                        api_format: &str,
                        capability: &str,
                        input_modalities: &[&str],
                        output_modalities: &[&str]|
         -> ModelInfo {
            serde_json::from_value(serde_json::json!({
                "catalogKey": format!("{vendor_code}/closure-{capability}"),
                "modelId": format!("closure-{capability}"),
                "displayName": "Closure Probe",
                "vendorCode": vendor_code,
                "regionCode": "global",
                "familyCode": "test",
                "primaryCapability": capability,
                "apiFormat": api_format,
                "inputModalities": input_modalities,
                "outputModalities": output_modalities,
                "lifecycle": "active",
                "releaseStage": "active",
                "shelfState": "listed",
                "routingState": "enabled",
                "source": { "sourceUrl": "https://example.test/models", "observedAt": "2026-01-01T00:00:00Z" },
            }))
            .expect("closure probe model must deserialize")
        };

        let all_vendors: Vec<&str> = CATALOG_VENDORS
            .iter()
            .chain(VENDOR_ALIASES.iter())
            .copied()
            .collect();

        let mut native_seen = 0usize;
        let mut generic_seen = 0usize;

        for vendor_code in &all_vendors {
            for api_format in API_FORMATS {
                for (capability, input_modalities, output_modalities) in NATIVE_CAPABILITIES {
                    let model = model_of(
                        vendor_code,
                        api_format,
                        capability,
                        input_modalities,
                        output_modalities,
                    );
                    let descriptor = model_endpoint_descriptor(&model);
                    let context = format!(
                        "{vendor_code} / {api_format} / {capability} (in={input_modalities:?}, out={output_modalities:?})"
                    );

                    if descriptor.protocol_code == "vendor_native" {
                        native_seen += 1;
                        // Point (1): a native descriptor must name a declared
                        // endpoint *and* the declared path for it. Matching the
                        // code alone would let a descriptor keep the right code
                        // while advertising a path no arm answers — the exact
                        // shape of the `gemini.image_generation` /
                        // `kling.task_query` drifts the Node-side gate also
                        // checks.
                        let declared_path = declared
                            .iter()
                            .find(|(code, _)| *code == descriptor.endpoint_code)
                            .map(|(_, path)| *path);
                        assert_eq!(
                            declared_path,
                            Some(descriptor.path_template),
                            "invented vendor-native route: {context} binds {} at {} but no seeded \
                             api_endpoint declares that code (declared: {declared_path:?}). Add the \
                             resource in data/ai-routing/resources/vendor-native-resources.json \
                             and a classifier arm in both copies of \
                             provider_native_api_code_from_standard_path, or keep the model on the \
                             generic face.",
                            descriptor.endpoint_code,
                            descriptor.path_template,
                        );
                    } else {
                        generic_seen += 1;
                    }

                    assert!(
                        known_endpoint_codes.contains(&descriptor.endpoint_code),
                        "{context} produced endpoint code {} which is neither a declared \
                         vendor-native endpoint nor a known generic face; a descriptor arm has \
                         invented a route",
                        descriptor.endpoint_code,
                    );

                    // Point (2): the accounting side resolves the meter from the
                    // modality, so an endpoint it cannot name falls through to
                    // the generic media meter and bills the wrong unit.
                    assert!(
                        endpoint_modality_code(&descriptor.endpoint_code).is_some(),
                        "{context} produced endpoint code {} which resolves to no modality; \
                         the accounting side cannot pick a meter for it",
                        descriptor.endpoint_code,
                    );
                }
            }
        }

        // The sweep has to actually exercise both faces, otherwise a future
        // refactor that made every descriptor generic would pass by vacuity.
        assert!(
            native_seen > 0,
            "the sweep produced no vendor_native descriptor at all; the closure assertion is vacuous"
        );
        assert!(
            generic_seen > 0,
            "the sweep produced no generic descriptor at all; the closure assertion is vacuous"
        );

        // Every declared vendor-native endpoint must be reachable by *some*
        // sweep input, otherwise the declaration has rotted: a resource no
        // descriptor can bind is a resource no model can use, which is how
        // `minimax.music_generation` sat declared-but-unbound while every music
        // model collapsed onto the Suno-protocol face.
        let mut reachable = std::collections::BTreeSet::new();
        for vendor_code in &all_vendors {
            for api_format in API_FORMATS {
                for (capability, input_modalities, output_modalities) in NATIVE_CAPABILITIES {
                    let descriptor = model_endpoint_descriptor(&model_of(
                        vendor_code,
                        api_format,
                        capability,
                        input_modalities,
                        output_modalities,
                    ));
                    if descriptor.protocol_code == "vendor_native" {
                        reachable.insert(descriptor.endpoint_code.clone());
                    }
                }
            }
        }
        // Endpoints that are legitimately not bound by a *capability* descriptor:
        // the utility / poll surfaces (`*.task_query`, embeddings, streaming and
        // embed actions), and the *feature-entry* surfaces, which the generation
        // service drives with an explicit api code rather than by a model's
        // `primaryCapability`. They are declared for the classifier and granted
        // by their resource groups, not bound (see the reasons below).
        const NOT_BOUND_BY_DESCRIPTOR: &[&str] = &[
            // Utility surfaces: no model binds to them.
            "anthropic.claude_code",
            "anthropic.messages",
            "gemini.embed_content",
            "gemini.generate_content",
            "gemini.stream_generate_content",
            // Poll surfaces: reached by a submitted task id, not by a model.
            "black_forest_labs.task_query",
            "jimeng.task_query",
            "kling.task_query",
            "runway.task_query",
            "suno.music_generation",
            "suno.music_task_query",
            "volcengine.task_query",
            // Feature-entry surfaces. `kling.avatar` / `kling.motion_control` are
            // the digital-human and motion-control features; `kling.image_to_video`
            // and `gemini.nano_banana.image_generation` are alternative entry
            // points into image/video generation that a caller selects
            // explicitly. All four carry a classifier arm in both copies of
            // `provider_native_api_code_from_standard_path` and a resource grant
            // (`admin-api-groups.json`), and `avatar_motion_routing_e2e.rs` routes
            // the first two end-to-end. They are not bound because no model's
            // `primaryCapability` selects them: binding a model to the avatar
            // surface would make every `video` model answer avatar requests.
            "gemini.nano_banana.image_generation",
            "kling.avatar",
            "kling.image_to_video",
            "kling.motion_control",
            "vidu.motion_sync",
        ];
        let unbound: Vec<&str> = declared
            .iter()
            .map(|(code, _)| *code)
            .filter(|code| !reachable.contains(*code))
            .filter(|code| !NOT_BOUND_BY_DESCRIPTOR.contains(code))
            .collect();
        assert!(
            unbound.is_empty(),
            "declared vendor-native endpoints no descriptor can bind ({unbound:?}); either the \
             descriptor table lost an arm or the declaration is stale — a declared-but-unbindable \
             endpoint is a model that can never reach it"
        );
    }

}
