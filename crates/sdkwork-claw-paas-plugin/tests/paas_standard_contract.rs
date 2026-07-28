use serde_json::json;

use sdkwork_claw_paas_plugin::{
    default_paas_plugin_registry, standard_paas_service_groups, AlibabaPaasProviderPlugin,
    BaiduPaasProviderPlugin, PaasCapability, PaasDocumentPage, PaasFaceCompareRequest,
    PaasImageInput, PaasOcrRequest, PaasOcrResponse, PaasOperation, PaasProviderPlugin,
    PaasProviderPluginError, PaasProviderPluginFuture, PaasProviderPluginMetadata,
    PaasProviderRegistry, PaasProviderRequestContext, PaasProviderRoutingKey, PaasStandardRequest,
    PaasStandardResponse, TencentPaasProviderPlugin,
};

#[test]
fn standard_paas_catalog_groups_core_capabilities_and_supplier_codes() {
    let groups = standard_paas_service_groups();

    assert_eq!("ocr", groups[0].code);
    assert_eq!("OCR识别", groups[0].name);
    assert_eq!(
        vec![
            "general_text",
            "document_text",
            "id_card",
            "bank_card",
            "business_license",
            "invoice",
        ],
        groups[0].operations
    );
    assert_eq!(
        vec!["baidu", "alibaba", "tencent"],
        groups[0].supplier_codes
    );
    assert!(groups
        .iter()
        .any(|group| group.code == "face_compare" && group.name == "人脸比对"));
    assert!(groups
        .iter()
        .any(|group| group.code == "face_liveness_verification" && group.name == "人脸核身"));
    assert!(groups.iter().any(|group| group.code == "content_moderation"
        && group.operations.contains(&"video_moderation")));
}

#[test]
fn default_registry_loads_builtin_provider_plugins_by_routing_key() {
    let registry = default_paas_plugin_registry();

    let baidu_ocr = registry
        .resolve(&PaasProviderRoutingKey {
            supplier_code: "baidu",
            operation: PaasOperation::OcrGeneralText,
        })
        .expect("baidu OCR plugin should be registered");
    assert_eq!("sdkwork.paas.baidu", baidu_ocr.metadata().plugin_id);
    assert!(baidu_ocr.supports_operation(PaasOperation::OcrGeneralText));

    let tencent_face = registry
        .resolve(&PaasProviderRoutingKey {
            supplier_code: "tencent",
            operation: PaasOperation::FaceCompareOneToOne,
        })
        .expect("tencent face compare plugin should be registered");
    assert_eq!("sdkwork.paas.tencent", tencent_face.metadata().plugin_id);

    assert!(registry
        .resolve(&PaasProviderRoutingKey {
            supplier_code: "unknown-cloud",
            operation: PaasOperation::ObjectStorageSignedUrl,
        })
        .is_none());
}

#[test]
fn builtin_provider_plugins_are_componentized_by_provider_family() {
    let baidu = BaiduPaasProviderPlugin.metadata();
    assert_eq!("sdkwork.paas.baidu", baidu.plugin_id);
    assert_eq!("baidu", baidu.provider_family);
    assert_eq!(vec!["baidu", "baidu-cloud"], baidu.supplier_codes);
    assert_eq!(vec!["api_key", "ak_sk"], baidu.credential_kinds);

    let alibaba = AlibabaPaasProviderPlugin.metadata();
    assert_eq!("sdkwork.paas.alibaba", alibaba.plugin_id);
    assert_eq!("alibaba", alibaba.provider_family);
    assert_eq!(
        vec!["alibaba", "alicloud", "aliyun"],
        alibaba.supplier_codes
    );
    assert_eq!(vec!["access_key"], alibaba.credential_kinds);

    let tencent = TencentPaasProviderPlugin.metadata();
    assert_eq!("sdkwork.paas.tencent", tencent.plugin_id);
    assert_eq!("tencent", tencent.provider_family);
    assert_eq!(vec!["tencent", "tencent-cloud"], tencent.supplier_codes);
    assert_eq!(vec!["secret_id_secret_key"], tencent.credential_kinds);
}

#[test]
fn custom_provider_plugin_can_be_registered_without_changing_registry_code() {
    let registry = PaasProviderRegistry::new().with_plugin(Box::new(MockInvoicePlugin));

    let plugin = registry
        .resolve(&PaasProviderRoutingKey {
            supplier_code: "mock-cloud",
            operation: PaasOperation::OcrInvoice,
        })
        .expect("custom plugin should resolve by declared provider and operation");

    assert_eq!("mock-cloud", plugin.metadata().supplier_codes[0]);
    assert!(plugin.supports_operation(PaasOperation::OcrInvoice));
    assert!(!plugin.supports_operation(PaasOperation::FaceCompareOneToOne));
}

#[test]
fn standard_requests_and_responses_serialize_as_public_api_contracts() {
    let request = PaasStandardRequest::Ocr(PaasOcrRequest {
        operation: PaasOperation::OcrGeneralText,
        image: PaasImageInput::Url {
            url: "https://example.test/id-card.png".to_owned(),
        },
        language_hint: Some("zh-CN".to_owned()),
        options: json!({"detectDirection": true}),
    });
    let request_payload = serde_json::to_value(&request).unwrap();

    assert_eq!("ocr", request_payload["type"]);
    assert_eq!("ocr.general_text", request_payload["operation"]);
    assert_eq!(
        "https://example.test/id-card.png",
        request_payload["image"]["url"]
    );
    assert_eq!(true, request_payload["options"]["detectDirection"]);

    let response = PaasOcrResponse {
        supplier_code: "baidu".to_owned(),
        provider_request_id: Some("request-1".to_owned()),
        pages: vec![PaasDocumentPage {
            page_index: 0,
            text: "统一社会信用代码".to_owned(),
            blocks: Vec::new(),
        }],
        raw_provider_response: Some(json!({"native": "redacted"})),
    };
    let response_payload = serde_json::to_value(&response).unwrap();

    assert_eq!("baidu", response_payload["providerCode"]);
    assert_eq!("request-1", response_payload["providerRequestId"]);
    assert_eq!("统一社会信用代码", response_payload["pages"][0]["text"]);
    assert_eq!(
        "redacted",
        response_payload["rawProviderResponse"]["native"]
    );
}

#[test]
fn object_reference_image_input_uses_camel_case_discriminator() {
    let image = PaasImageInput::ObjectRef {
        bucket: "paas-inputs".to_owned(),
        object_key: "ocr/general.png".to_owned(),
    };
    let payload = serde_json::to_value(&image).unwrap();

    assert_eq!("objectRef", payload["inputType"]);
    assert_eq!("paas-inputs", payload["bucket"]);
    assert_eq!("ocr/general.png", payload["objectKey"]);
}

#[test]
fn provider_request_context_keeps_routing_auth_and_region_separate_from_standard_body() {
    let context = PaasProviderRequestContext {
        tenant_id: 100001,
        organization_id: 0,
        supplier_code: "alibaba".to_owned(),
        region_code: Some("cn-hangzhou".to_owned()),
        credential_ref: Some("secret://paas/alibaba/main".to_owned()),
        timeout_ms: Some(30_000),
    };
    let request = PaasStandardRequest::FaceCompare(PaasFaceCompareRequest {
        operation: PaasOperation::FaceCompareOneToOne,
        source: PaasImageInput::Base64 {
            media_type: "image/jpeg".to_owned(),
            data: "source-base64".to_owned(),
        },
        target: PaasImageInput::Base64 {
            media_type: "image/jpeg".to_owned(),
            data: "target-base64".to_owned(),
        },
        options: json!({"qualityControl": "normal"}),
    });

    assert_eq!("alibaba", context.supplier_code);
    assert_eq!("face.compare.one_to_one", request.operation().as_str());
}

#[tokio::test]
async fn provider_plugin_invocation_uses_standard_request_and_response_types() {
    let registry = PaasProviderRegistry::new().with_plugin(Box::new(MockOcrPlugin));
    let plugin = registry
        .resolve(&PaasProviderRoutingKey {
            supplier_code: "mock-ocr",
            operation: PaasOperation::OcrGeneralText,
        })
        .expect("mock OCR plugin should resolve");

    let response = plugin
        .invoke(
            PaasProviderRequestContext {
                tenant_id: 1,
                organization_id: 2,
                supplier_code: "mock-ocr".to_owned(),
                region_code: Some("global".to_owned()),
                credential_ref: Some("secret://mock-ocr/default".to_owned()),
                timeout_ms: Some(1000),
            },
            PaasStandardRequest::Ocr(PaasOcrRequest {
                operation: PaasOperation::OcrGeneralText,
                image: PaasImageInput::Url {
                    url: "https://example.test/general.png".to_owned(),
                },
                language_hint: None,
                options: json!({}),
            }),
        )
        .await
        .expect("custom plugin should return a standard response");

    match response {
        PaasStandardResponse::Ocr(response) => {
            assert_eq!("mock-ocr", response.supplier_code);
            assert_eq!("mock-request-1", response.provider_request_id.unwrap());
            assert_eq!("recognized text", response.pages[0].text);
        }
        _ => panic!("expected OCR response"),
    }
}

#[tokio::test]
async fn metadata_only_provider_plugin_returns_explicit_not_configured_for_native_calls() {
    // Alibaba plugin is metadata-only (no `invoke` override); it must return
    // ProviderNotConfigured so callers know no native adapter is wired yet.
    let registry = default_paas_plugin_registry();
    let plugin = registry
        .resolve(&PaasProviderRoutingKey {
            supplier_code: "alibaba",
            operation: PaasOperation::OcrGeneralText,
        })
        .expect("alibaba OCR plugin should resolve");

    let error = plugin
        .invoke(
            PaasProviderRequestContext {
                tenant_id: 1,
                organization_id: 2,
                supplier_code: "alibaba".to_owned(),
                region_code: Some("cn-hangzhou".to_owned()),
                credential_ref: None,
                timeout_ms: Some(1000),
            },
            PaasStandardRequest::Ocr(PaasOcrRequest {
                operation: PaasOperation::OcrGeneralText,
                image: PaasImageInput::Url {
                    url: "https://example.test/general.png".to_owned(),
                },
                language_hint: None,
                options: json!({}),
            }),
        )
        .await
        .expect_err("metadata-only plugin must not pretend native calls are implemented");

    assert_eq!(
        PaasProviderPluginError::ProviderNotConfigured {
            supplier_code: "alibaba".to_owned(),
            operation: PaasOperation::OcrGeneralText
        },
        error
    );
}

#[tokio::test]
async fn baidu_paas_provider_plugin_invoke_returns_synthetic_ocr_response() {
    // Baidu plugin overrides `invoke` for OCR operations, producing a synthetic
    // response for billing settlement and trace correlation while the
    // cloud-gateway passthrough transport handles the real upstream HTTP relay.
    let registry = default_paas_plugin_registry();
    let plugin = registry
        .resolve(&PaasProviderRoutingKey {
            supplier_code: "baidu",
            operation: PaasOperation::OcrGeneralText,
        })
        .expect("baidu OCR plugin should resolve");

    let response = plugin
        .invoke(
            PaasProviderRequestContext {
                tenant_id: 100042,
                organization_id: 7,
                supplier_code: "baidu".to_owned(),
                region_code: Some("cn".to_owned()),
                credential_ref: Some("secret://paas/baidu/main".to_owned()),
                timeout_ms: Some(15_000),
            },
            PaasStandardRequest::Ocr(PaasOcrRequest {
                operation: PaasOperation::OcrGeneralText,
                image: PaasImageInput::Base64 {
                    media_type: "image/png".to_owned(),
                    data: "base64-payload".to_owned(),
                },
                language_hint: Some("zh-CN".to_owned()),
                options: json!({}),
            }),
        )
        .await
        .expect("baidu OCR native adapter must return a synthetic response");

    match response {
        PaasStandardResponse::Ocr(response) => {
            assert_eq!("baidu", response.supplier_code);
            let provider_request_id = response
                .provider_request_id
                .as_ref()
                .expect("provider_request_id must be set for trace correlation");
            assert!(
                provider_request_id.starts_with("baidu-ocr-ocr.general_text-t"),
                "provider_request_id should encode provider, operation, tenant: {provider_request_id}"
            );
            assert!(
                provider_request_id.ends_with("t100042"),
                "provider_request_id should encode tenant_id for trace correlation: {provider_request_id}"
            );
            assert_eq!(1, response.pages.len());
            assert!(!response.pages[0].text.is_empty());
            let raw = response
                .raw_provider_response
                .as_ref()
                .expect("raw_provider_response must carry synthetic marker");
            assert_eq!("baidu", raw["provider"]);
            assert_eq!("ocr.general_text", raw["operation"]);
            assert_eq!(true, raw["synthetic"]);
            assert_eq!("cloud-gateway-passthrough", raw["transport"]);
            // Image input summary must never leak raw payload bytes.
            assert_eq!("base64", raw["input"]["kind"]);
            assert_eq!("image/png", raw["input"]["mediaType"]);
            assert_eq!(
                "base64-payload".len(),
                raw["input"]["length"].as_u64().unwrap() as usize
            );
        }
        _ => panic!("expected OCR response from baidu native adapter"),
    }
}

#[tokio::test]
async fn baidu_paas_provider_plugin_invoke_returns_not_configured_for_non_ocr_operations() {
    // Baidu plugin overrides `invoke` only for OCR; non-OCR operations must
    // still return ProviderNotConfigured so callers know no native adapter
    // is wired for that operation yet.
    let registry = default_paas_plugin_registry();
    let plugin = registry
        .resolve(&PaasProviderRoutingKey {
            supplier_code: "baidu",
            operation: PaasOperation::FaceCompareOneToOne,
        })
        .expect("baidu face compare plugin should resolve (metadata-only)");

    let error = plugin
        .invoke(
            PaasProviderRequestContext {
                tenant_id: 1,
                organization_id: 2,
                supplier_code: "baidu".to_owned(),
                region_code: Some("cn".to_owned()),
                credential_ref: None,
                timeout_ms: Some(1000),
            },
            PaasStandardRequest::FaceCompare(PaasFaceCompareRequest {
                operation: PaasOperation::FaceCompareOneToOne,
                source: PaasImageInput::Url {
                    url: "https://example.test/source.png".to_owned(),
                },
                target: PaasImageInput::Url {
                    url: "https://example.test/target.png".to_owned(),
                },
                options: json!({}),
            }),
        )
        .await
        .expect_err("non-OCR operations must return ProviderNotConfigured");

    assert_eq!(
        PaasProviderPluginError::ProviderNotConfigured {
            supplier_code: "baidu".to_owned(),
            operation: PaasOperation::FaceCompareOneToOne
        },
        error
    );
}

struct MockInvoicePlugin;

impl PaasProviderPlugin for MockInvoicePlugin {
    fn metadata(&self) -> PaasProviderPluginMetadata {
        PaasProviderPluginMetadata {
            plugin_id: "mock.invoice".to_owned(),
            provider_family: "mock-cloud".to_owned(),
            supplier_codes: vec!["mock-cloud".to_owned()],
            capabilities: vec![PaasCapability::Ocr],
            operations: vec![PaasOperation::OcrInvoice],
            credential_kinds: vec!["api_key".to_owned()],
            default_regions: vec!["global".to_owned()],
        }
    }
}

struct MockOcrPlugin;

impl PaasProviderPlugin for MockOcrPlugin {
    fn metadata(&self) -> PaasProviderPluginMetadata {
        PaasProviderPluginMetadata {
            plugin_id: "mock.ocr".to_owned(),
            provider_family: "mock-cloud".to_owned(),
            supplier_codes: vec!["mock-ocr".to_owned()],
            capabilities: vec![PaasCapability::Ocr],
            operations: vec![PaasOperation::OcrGeneralText],
            credential_kinds: vec!["api_key".to_owned()],
            default_regions: vec!["global".to_owned()],
        }
    }

    fn invoke<'a>(
        &'a self,
        context: PaasProviderRequestContext,
        request: PaasStandardRequest,
    ) -> PaasProviderPluginFuture<'a> {
        Box::pin(async move {
            assert_eq!("mock-ocr", context.supplier_code);
            assert_eq!("ocr.general_text", request.operation().as_str());
            Ok(PaasStandardResponse::Ocr(PaasOcrResponse {
                supplier_code: context.supplier_code,
                provider_request_id: Some("mock-request-1".to_owned()),
                pages: vec![PaasDocumentPage {
                    page_index: 0,
                    text: "recognized text".to_owned(),
                    blocks: Vec::new(),
                }],
                raw_provider_response: Some(json!({"mock": true})),
            }))
        })
    }
}
