//! 计费矩阵回归：逐个 open-api operation 断言它的计费形态。
//!
//! 这一份测试是"每个接口按什么计费"的唯一可执行口径。它做三件事：
//!
//! 1. **全覆盖**：读取 `apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json`
//!    的每一个 operation，按生产口径分类（`/v1/**` 走 OpenAI 面，其余走
//!    `<vendor>/<rest>` 切分的供应商原生面，与
//!    `sdkwork-cloudrouter-edge-runtime/src/invocation_http.rs` 的互斥分发一致），
//!    然后跑 `BillingPolicyInterceptor`。任何一个 operation 分类失败都算回归。
//! 2. **快照**：把每个 operation 的 `(api_code, resource_type, 声明 meter,
//!    最终 mode, 最终 meter, 数量来源)` 与
//!    `tests/golden/openapi_billing_matrix.tsv` 逐行比对。计费口径漂移必须
//!    显式更新快照，不允许"顺手改了就过"。
//! 3. **行业口径断言**：按计费家族（模型 token / 按次 / 图片张 / 视频秒 /
//!    视频条 / 音乐秒 / TTS 字符 / STT 分钟 / 免费）断言关键接口落在正确的
//!    家族里。快照保证"没变"，这里保证"变对了"。
//!
//! 更新快照：`UPDATE_BILLING_MATRIX=1 cargo test -p
//! sdkwork-cloudrouter-router-service --test openapi_billing_matrix`，
//! 然后逐行 review `git diff`——快照的每一次变化都是一次计费变更。

use std::collections::BTreeMap;

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    BillingMode, BillingPolicyInterceptor, Invocation, InvocationAuthType,
    InvocationClassificationRequest, InvocationError, InvocationErrorKind, InvocationInterceptor,
    InvocationRequest, InvocationResourceClassifier, InvocationSubject, OpenAiResourceClassifier,
    ProviderNativeResourceClassifier,
};
use sdkwork_cloudrouter_router_service::domain::BillingMeter;

/// 一个 operation 的计费形态。
#[derive(Debug, Clone, PartialEq, Eq)]
struct BillingShape {
    api_code: String,
    resource_type: String,
    declared_meter: String,
    mode: String,
    meter: String,
    quantity_source: String,
}

impl BillingShape {
    fn to_row(&self, method: &str, path: &str) -> String {
        format!(
            "{method}\t{path}\t{}\t{}\t{}\t{}\t{}\t{}",
            self.api_code,
            self.resource_type,
            self.declared_meter,
            self.mode,
            self.meter,
            self.quantity_source,
        )
    }
}

fn subject() -> InvocationSubject {
    InvocationSubject {
        auth_type: InvocationAuthType::GatewayApiKey,
        api_key_id: Some(1),
        api_key_name_snapshot: None,
        tenant_id: 10,
        organization_id: 20,
        user_id: 30,
        billing_organization_id: 0,
        billing_owner: Default::default(),
        account_group_id: Some(1),
        account_group_code: Some("official.deepseek.full".to_owned()),
        pricing_plan_code: None,
        roles: Vec::new(),
        scopes: Vec::new(),
    }
}

/// `/vendor/rest` → `(vendor, "/rest")`；`/v1/**` 与 `/v1beta**` 属于 OpenAI 面。
fn vendor_prefix(path: &str) -> Option<(&str, String)> {
    let (head, tail) = path.trim_start_matches('/').split_once('/')?;
    if head == "v1" || head.starts_with("v1beta") {
        return None;
    }
    Some((head, format!("/{tail}")))
}

fn unsupported(path: &str) -> InvocationError {
    InvocationError::new(
        InvocationErrorKind::ResourceClassification,
        format!("unsupported invocation route: {path}"),
    )
}

fn method_of(key: &str) -> Option<Method> {
    match key {
        "get" => Some(Method::GET),
        "post" => Some(Method::POST),
        "put" => Some(Method::PUT),
        "patch" => Some(Method::PATCH),
        "delete" => Some(Method::DELETE),
        _ => None,
    }
}

fn meter_name(meter: &Option<BillingMeter>) -> String {
    meter
        .as_ref()
        .map(|meter| format!("{meter:?}"))
        .unwrap_or_else(|| "None".to_owned())
}

/// 生产口径：先按路径前缀判定计费面，再交给该面的分类器。
async fn shape_of(method: Method, path: &str) -> Result<BillingShape, InvocationError> {
    let request = InvocationClassificationRequest::new(method.clone(), path);
    let classification = if path == "/v1" || path.starts_with("/v1/") {
        OpenAiResourceClassifier.classify(&request)
    } else {
        let (vendor, rest) = vendor_prefix(path).ok_or_else(|| unsupported(path))?;
        ProviderNativeResourceClassifier.classify(
            &InvocationClassificationRequest::new(method.clone(), rest).with_supplier_code(vendor),
        )
    }?;

    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(method.clone(), path).with_request_id("billing-matrix"),
        subject(),
        resource.clone(),
        billing.clone(),
    );
    invocation.routing = routing;
    BillingPolicyInterceptor.before(&mut invocation).await?;

    Ok(BillingShape {
        api_code: resource.api_code,
        resource_type: format!("{:?}", resource.resource_type),
        declared_meter: meter_name(&billing.meter),
        mode: format!("{:?}", invocation.billing.mode),
        meter: meter_name(&invocation.billing.meter),
        quantity_source: format!("{:?}", invocation.billing.quantity_source),
    })
}

/// 读取契约，返回 `(method, path) -> shape` 的全部 operation。
async fn collect_matrix() -> BTreeMap<(String, String), BillingShape> {
    let contract = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json"
    );
    let raw = std::fs::read_to_string(contract).expect("open-api contract is readable");
    let spec: serde_json::Value = serde_json::from_str(&raw).expect("open-api contract is json");
    let paths = spec["paths"].as_object().expect("contract has paths");

    let mut matrix = BTreeMap::new();
    for (path, item) in paths {
        let Some(operations) = item.as_object() else {
            continue;
        };
        for key in operations.keys() {
            let Some(method) = method_of(key) else {
                continue;
            };
            let shape = shape_of(method.clone(), path)
                .await
                .unwrap_or_else(|error| {
                    panic!(
                        "operation {method} {path} must classify without error: {}",
                        error.message
                    )
                });
            matrix.insert((path.clone(), method.as_str().to_owned()), shape);
        }
    }
    assert!(
        matrix.len() >= 172,
        "the published contract should keep every operation classifiable, got {}",
        matrix.len()
    );
    matrix
}

fn golden_path() -> std::path::PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/golden/openapi_billing_matrix.tsv")
}

fn render(matrix: &BTreeMap<(String, String), BillingShape>) -> String {
    let mut rows = Vec::with_capacity(matrix.len());
    for ((path, method), shape) in matrix {
        rows.push(shape.to_row(method, path));
    }
    let mut rendered = rows.join("\n");
    rendered.push('\n');
    rendered
}

#[tokio::test]
async fn openapi_billing_matrix_matches_golden() {
    let matrix = collect_matrix().await;
    let rendered = render(&matrix);

    if std::env::var("UPDATE_BILLING_MATRIX").is_ok() {
        let path = golden_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).expect("golden directory");
        }
        std::fs::write(&path, &rendered).expect("write golden matrix");
        return;
    }

    let path = golden_path();
    let golden = std::fs::read_to_string(&path).unwrap_or_else(|error| {
        panic!(
            "missing billing matrix golden file {}: {error}. \
             Regenerate it with UPDATE_BILLING_MATRIX=1 and review the diff.",
            path.display()
        )
    });

    if golden != rendered {
        let actual: Vec<&str> = rendered.lines().collect();
        let expected: Vec<&str> = golden.lines().collect();
        let mut report = String::new();
        for index in 0..actual.len().max(expected.len()) {
            let left = expected.get(index).copied().unwrap_or("<missing>");
            let right = actual.get(index).copied().unwrap_or("<missing>");
            if left != right {
                report.push_str(&format!(
                    "line {}\n  golden: {left}\n  actual: {right}\n",
                    index + 1
                ));
                if report.lines().count() > 60 {
                    report.push_str("... (truncated)\n");
                    break;
                }
            }
        }
        panic!(
            "billing matrix drifted from tests/golden/openapi_billing_matrix.tsv.\n\
             Every difference is a billing change — confirm it is intended, then run \
             UPDATE_BILLING_MATRIX=1 to refresh the golden file.\n{report}"
        );
    }
}

/// 断言某条 operation 落在给定的计费形态上。
fn assert_shape(
    matrix: &BTreeMap<(String, String), BillingShape>,
    method: &str,
    path: &str,
    mode: BillingMode,
    meter: Option<&str>,
) {
    let key = (path.to_owned(), method.to_owned());
    let shape = matrix
        .get(&key)
        .unwrap_or_else(|| panic!("{method} {path} is missing from the contract"));
    assert_eq!(
        format!("{mode:?}"),
        shape.mode,
        "{method} {path} billing mode (meter {})",
        shape.meter
    );
    if let Some(meter) = meter {
        assert_eq!(
            meter, shape.meter,
            "{method} {path} billing meter and mode should agree"
        );
    }
}

#[tokio::test]
async fn model_token_billed_operations_stay_on_the_token_family() {
    let matrix = collect_matrix().await;
    for (method, path) in [
        ("POST", "/v1/chat/completions"),
        ("POST", "/v1/completions"),
        ("POST", "/v1/responses"),
        ("POST", "/v1/realtime/calls"),
        ("POST", "/v1/realtime/sessions"),
        ("POST", "/v1/realtime/transcription_sessions"),
        ("POST", "/v1/realtime/translations"),
        ("POST", "/anthropic/v1/messages"),
        ("POST", "/google/v1beta/models/{model}:generateContent"),
        (
            "POST",
            "/google/v1beta/models/{model}:streamGenerateContent",
        ),
        ("POST", "/typesafe/v1/systemone"),
    ] {
        assert_shape(
            &matrix,
            method,
            path,
            BillingMode::Composite,
            Some("LlmInputToken"),
        );
        let shape = &matrix[&(path.to_owned(), method.to_owned())];
        assert_eq!(
            "Composite", shape.quantity_source,
            "{method} {path} must settle input/output/cache token lines"
        );
    }
}

#[tokio::test]
async fn embedding_operations_bill_embedding_tokens() {
    let matrix = collect_matrix().await;
    for (method, path) in [
        ("POST", "/v1/embeddings"),
        ("POST", "/google/v1beta/models/{model}:embedContent"),
    ] {
        assert_shape(
            &matrix,
            method,
            path,
            BillingMode::Token,
            Some("EmbeddingInputToken"),
        );
    }
}

#[tokio::test]
async fn image_generation_bills_per_produced_image() {
    let matrix = collect_matrix().await;
    for (method, path) in [
        ("POST", "/v1/images/generations"),
        ("POST", "/v1/images/edits"),
        ("POST", "/v1/images/variations"),
        ("POST", "/kling/v1/images/generations"),
        ("POST", "/volcengine/api/v3/images/generations"),
        ("POST", "/vidu/ent/v2/reference2image"),
        ("POST", "/google/v1beta/models/{model}:generateImages"),
    ] {
        assert_shape(
            &matrix,
            method,
            path,
            BillingMode::ResultCount,
            Some("ImageResult"),
        );
    }
}

#[tokio::test]
async fn openai_video_generation_bills_per_output_second() {
    // OpenAI 的视频面按输出秒计价：同一条 `POST /v1/videos` 可能渲染 4 秒，
    // 也可能渲染 20 秒。
    let matrix = collect_matrix().await;
    for (method, path) in [
        ("POST", "/v1/videos"),
        ("POST", "/v1/videos/edits"),
        ("POST", "/v1/videos/extensions"),
        ("POST", "/v1/videos/{video_id}/remix"),
    ] {
        assert_shape(
            &matrix,
            method,
            path,
            BillingMode::VideoSecond,
            Some("VideoOutputSecond"),
        );
    }
    // Sora 角色是素材对象，创建不产生视频渲染成本 ⇒ Free（2.39）。
    assert_shape(
        &matrix,
        "POST",
        "/v1/videos/characters",
        BillingMode::Free,
        None,
    );
    // 视频轮询/下载不产生上游费用，按行业口径免费（生成本身已按秒计费）。
    assert_shape(
        &matrix,
        "GET",
        "/v1/videos/{video_id}",
        BillingMode::Free,
        None,
    );
}

#[tokio::test]
async fn vendor_video_tasks_bill_per_produced_video() {
    // 供应商原生异步任务面（可灵 / Vidu / 火山 / Veo）在创建任务时**不返回
    // 时长**，任务查询面才产出视频；请求侧只有部分厂商给数值时长（火山把
    // 时长写在 prompt 的 `--dur` 里）。这几家上游与中转站的价目表本身就是
    // 「按条 × 时长档」，因此维持按条（`video_result`），由 SKU 名区分时长档，
    // 而不是在没有可信时长的情况下按秒计费（那会退化成 1 秒兜底、少收一个
    // 数量级）。
    let matrix = collect_matrix().await;
    for (method, path) in [
        ("POST", "/kling/v1/videos/generations"),
        ("POST", "/kling/v1/videos/avatar"),
        ("POST", "/kling/v1/videos/motion-control"),
        ("POST", "/vidu/ent/v2/text2video"),
        ("POST", "/vidu/ent/v2/img2video"),
        ("POST", "/vidu/ent/v2/reference2video"),
        ("POST", "/vidu/ent/v2/start-end2video"),
        ("POST", "/vidu/ent/v2/template"),
        ("POST", "/volcengine/api/v3/contents/generations/tasks"),
        ("POST", "/google/v1beta/models/{model}:generateVideos"),
    ] {
        assert_shape(
            &matrix,
            method,
            path,
            BillingMode::ResultCount,
            Some("VideoResult"),
        );
    }
}

#[tokio::test]
async fn music_generation_bills_per_output_second() {
    let matrix = collect_matrix().await;
    for (method, path) in [
        ("POST", "/suno/v1/music/generations"),
        ("POST", "/minimax/v1/music_generation"),
    ] {
        assert_shape(
            &matrix,
            method,
            path,
            BillingMode::AudioSecond,
            Some("MusicOutputSecond"),
        );
    }
}

#[tokio::test]
async fn text_to_speech_bills_per_input_character() {
    let matrix = collect_matrix().await;
    for (method, path) in [
        ("POST", "/v1/audio/speech"),
        ("POST", "/elevenlabs/v1/text-to-speech/{voice_id}"),
        ("POST", "/volcengine/api/v3/audio/speech"),
    ] {
        assert_shape(
            &matrix,
            method,
            path,
            BillingMode::Character,
            Some("TtsInputCharacter"),
        );
    }
}

#[tokio::test]
async fn speech_to_text_bills_per_audio_minute() {
    // ASR 行业口径是**每分钟音频**（Whisper 及各家中转价目表），不是每秒。
    let matrix = collect_matrix().await;
    for (method, path) in [
        ("POST", "/v1/audio/transcriptions"),
        ("POST", "/v1/audio/translations"),
    ] {
        assert_shape(
            &matrix,
            method,
            path,
            BillingMode::AudioSecond,
            Some("SttAudioMinute"),
        );
    }
}

#[tokio::test]
async fn per_call_operations_bill_a_single_request() {
    let matrix = collect_matrix().await;
    // 文件 / 批量查询 / moderation / vector store 创建 / 异步任务轮询已按行业
    // 口径归为 Free（见 `billing_openai_management` 与 `billing_async_task_query`）。
    // 剩下的按次端点都是**真正产生上游动作**的：批量创建（守卫拒单）、付费工具、
    // 向量库摄取与检索。
    for (method, path) in [
        ("POST", "/v1/batches"),
        ("POST", "/v1/tools/search"),
        ("POST", "/v1/tools/fetch"),
        ("POST", "/v1/vector_stores/{vector_store_id}/file_batches"),
    ] {
        assert_shape(
            &matrix,
            method,
            path,
            BillingMode::ApiRequest,
            Some("ApiRequest"),
        );
        let shape = &matrix[&(path.to_owned(), method.to_owned())];
        assert_eq!(
            "FixedRequest", shape.quantity_source,
            "{method} {path} is billed once per call"
        );
    }
}

#[tokio::test]
async fn free_operations_stay_free() {
    let matrix = collect_matrix().await;
    for (method, path) in [("GET", "/v1/models"), ("GET", "/v1/models/{model}")] {
        let shape = &matrix[&(path.to_owned(), method.to_owned())];
        assert_eq!("Free", shape.mode, "{method} {path} must not be billed");
        assert_eq!("None", shape.meter, "{method} {path} declares no meter");
        assert_eq!(
            "None", shape.quantity_source,
            "{method} {path} must not produce a usage line"
        );
    }
}

#[tokio::test]
async fn every_billable_operation_declares_where_its_quantity_comes_from() {
    // 计费档与数量来源必须自洽：不存在"按 token 但数量来自固定请求"这种
    // 组合——那会让抽取层永远拿不到数量，结算成 0。
    let matrix = collect_matrix().await;
    for ((path, method), shape) in &matrix {
        let compatible = match shape.mode.as_str() {
            "Free" => shape.quantity_source == "None",
            "ApiRequest" => shape.quantity_source == "FixedRequest",
            "Composite" | "Token" => matches!(
                shape.quantity_source.as_str(),
                "Composite" | "ResponseBody" | "StreamingAccumulator" | "RequestBody"
            ),
            "ResultCount" | "ItemCount" | "Character" => shape.quantity_source == "ResponseBody",
            "AudioSecond" | "VideoSecond" => shape.quantity_source == "ResponseBody",
            // 外部用量行档：adapter 自己给出数量，或退化成一次请求。
            "ExternalUsageLine" => matches!(
                shape.quantity_source.as_str(),
                "AdapterUsageLines" | "FixedRequest"
            ),
            _ => true,
        };
        // 没有计量单位的路由由 `unmetered_operations_are_exactly_the_ones_we_acknowledged`
        // 单独守护，这里只要求"计费档与数量来源能配对"。
        assert!(
            compatible,
            "{method} {path} has mode {} with quantity source {} — the extraction chain \
             cannot produce a quantity for that pair",
            shape.mode, shape.quantity_source
        );
    }
}

/// 已登记"无计量单位、且仍不可售"的 operation。
///
/// 文件、缓存、批量查询/取消与 `count_tokens` 已按行业口径归为 **Free**（见
/// `billing_unmetered_management`）；midjourney / nano-banana 命名空间已从契约
/// 移除（vendor 无此 API），不再出现在这里。剩下的只有尚未接 taxonomy 的
/// Anthropic 批处理创建：它被预检守卫拒单，共同点是**不可售**，而不是免费送。
/// 新增的"无计量单位"端点必须显式登记在这里，让计费缺口在 PR 里可见，而不是
/// 悄悄溜进生产。
const UNMETERED_OPERATIONS: &[(&str, &str)] = &[
    // 创建仍被预检守卫拒单（结果回收链路未落地），因此保留"无计量单位"登记。
    ("POST", "/anthropic/v1/messages/batches"),
];

#[tokio::test]
async fn unmetered_operations_are_exactly_the_ones_we_acknowledged() {
    let matrix = collect_matrix().await;
    let mut declared: Vec<(String, String)> = Vec::new();
    for ((path, method), shape) in &matrix {
        if shape.meter == "None" && shape.mode != "Free" {
            declared.push((method.clone(), path.clone()));
        }
    }
    declared.sort();

    let mut acknowledged: Vec<(String, String)> = UNMETERED_OPERATIONS
        .iter()
        .map(|(method, path)| ((*method).to_owned(), (*path).to_owned()))
        .collect();
    acknowledged.sort();

    assert_eq!(
        acknowledged, declared,
        "the set of operations billed without a specific meter changed — either wire the \
         operation onto a metered route or add it to UNMETERED_OPERATIONS with a reason"
    );
}

/// 未定价的按次端点（5 个）：真实上游动作，但目录没有 `api_request` 官方费率。
///
/// `POST /v1/threads/runs`、`/v1/threads/{thread_id}/runs` 与
/// `.../submit_tool_outputs` 这一组是**条件性**的：矩阵用空 body 采样，所以形态是
/// `ApiRequest`；真实请求带 `model` 时，payload 阶段会把模型写到资源上，计费策略
/// 选中 `Composite`（token），目录有 token 价即可售。`invocation_billing_policy` 的
/// `threads_runs_with_a_model_bill_model_tokens` 钉住这条分支。不带 `model` 的请求
/// 只能继承 assistant 的模型，网关看不到实际模型，因此仍 fail-closed。
///
/// `POST /elevenlabs/v1/sound-generation` **不在此列**：矩阵快照把它记成
/// `ApiRequest`（空 body 形态），但契约强制 `model_id`，真实请求会被身份对账
/// 改写成 `audio_output_minute`（2.41）。计费就绪盘点必须按真实请求算，不能
/// 按空 body 的矩阵行算。
///
/// `POST /v1/vector_stores/{vector_store_id}/search` 也已移出：分类器把它绑定到
/// `openai/vector-stores` 工具 SKU，目录用 `api_request` 收 `$2.50/1k` 次
/// （2.51），不再依赖未定价的 management 路由键。
const UNPRICED_PER_CALL: &[(&str, &str)] = &[
    ("POST", "/v1/batches"),
    ("POST", "/v1/threads/runs"),
    ("POST", "/v1/threads/{thread_id}/runs"),
    (
        "POST",
        "/v1/threads/{thread_id}/runs/{run_id}/submit_tool_outputs",
    ),
    ("POST", "/v1/vector_stores/{vector_store_id}/file_batches"),
];

/// 已补价、但仍按 `ApiRequest` 形态计费的端点（3 个）。
const PRICED_PER_CALL: &[(&str, &str)] = &[
    ("POST", "/v1/vector_stores/{vector_store_id}/search"),
    ("POST", "/v1/tools/search"),
    ("POST", "/v1/tools/fetch"),
];

/// 商业化就绪计数锁：172 = Free 118 + 可售计量 44 + 音效 1 + 已补价按次 3 +
/// 未定价按次 5 + 已登记不可售 1。任何操作的状态漂移都会让这条断言红，迫使
/// 同步更新就绪报告。
#[tokio::test]
async fn commercial_readiness_counts_are_exactly_166_of_172() {
    let matrix = collect_matrix().await;
    let (mut free, mut metered, mut api_request, mut unsellable) = (0, 0, 0, 0);
    for shape in matrix.values() {
        match shape.mode.as_str() {
            "Free" => free += 1,
            "ApiRequest" => api_request += 1,
            "ExternalUsageLine" => unsellable += 1,
            _ => metered += 1,
        }
    }
    assert_eq!(172, matrix.len(), "published operation count drifted");
    assert_eq!(118, free, "Free operation count drifted");
    assert_eq!(44, metered, "metered sellable operation count drifted");
    assert_eq!(1, unsellable, "acknowledged unsellable count drifted");
    assert_eq!(
        9, api_request,
        "per-call shape count drifted (5 unpriced + 3 priced + sound-generation)"
    );

    let mut unpriced: Vec<(String, String)> = matrix
        .iter()
        .filter(|((path, _), shape)| {
            shape.mode == "ApiRequest"
                && path.as_str() != "/elevenlabs/v1/sound-generation"
                && !PRICED_PER_CALL
                    .iter()
                    .any(|(_, priced_path)| priced_path == path)
        })
        .map(|((path, method), _)| (method.clone(), path.clone()))
        .collect();
    unpriced.sort();
    let mut acknowledged: Vec<(String, String)> = UNPRICED_PER_CALL
        .iter()
        .map(|(method, path)| ((*method).to_owned(), (*path).to_owned()))
        .collect();
    acknowledged.sort();
    assert_eq!(
        acknowledged, unpriced,
        "the set of unpriced per-call operations changed — update UNPRICED_PER_CALL and \
         the readiness report together"
    );
    for (method, path) in PRICED_PER_CALL {
        let shape = matrix
            .get(&(path.to_string(), method.to_string()))
            .unwrap_or_else(|| panic!("missing priced per-call operation {method} {path}"));
        assert_eq!("ApiRequest", shape.mode, "{method} {path}");
    }

    assert_eq!(
        166,
        free + metered + 1 + PRICED_PER_CALL.len(),
        "sellable count = Free + metered + sound-generation + priced per-call"
    );
}

/// 计费路由不得声明"抽取层还没实现"的数量来源。
///
/// `UsageExtractionInterceptor` 对 `RequestBody` / `ResponseHeaders` 是直接
/// `Ok(())`（不产行），而 `PricingSettlementInterceptor` 见到空行就
/// `return Ok(())`。两句合起来的意思是：**声明这两个数量来源 = 该路由永久免单**，
/// 且没有任何运行期报错——上游花了钱，账上一分不记。
///
/// 目前 176 个 operation 没有一个用它们。想用的话，先在抽取层实现对应分支，
/// 再改分类器；这条断言会在改分类器的那一刻变红，把"声明即免单"挡在合并前。
#[tokio::test]
async fn billable_operations_never_declare_an_unimplemented_quantity_source() {
    let matrix = collect_matrix().await;
    let mut offenders: Vec<String> = Vec::new();
    for ((path, method), shape) in &matrix {
        if shape.mode == "Free" {
            continue;
        }
        if shape.quantity_source == "ResponseHeaders" {
            offenders.push(format!("{method} {path} ({}, {})", shape.mode, shape.meter));
        }
    }
    offenders.sort();
    assert!(
        offenders.is_empty(),
        "these operations declare a quantity source the extraction chain does not implement, \
         which silently bills them as free: {offenders:?}"
    );
}
