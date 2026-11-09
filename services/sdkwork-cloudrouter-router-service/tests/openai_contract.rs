use sdkwork_cloudrouter_router_service::api::openai_contract::{
    OpenAiAnnotationType, OpenAiChatCompletionRequest, OpenAiChatCompletionResponse,
    OpenAiChatContentPartType, OpenAiChatMessageContent, OpenAiChatMessageRole,
    OpenAiEmbeddingEncodingFormat, OpenAiEmbeddingInput, OpenAiEmbeddingList,
    OpenAiEmbeddingVector, OpenAiEmbeddingsRequest, OpenAiErrorBody, OpenAiErrorEnvelope,
    OpenAiIncompleteReason, OpenAiJsonSchemaAdditionalProperties, OpenAiJsonSchemaItems,
    OpenAiReasoningEffort, OpenAiReasoningSummary, OpenAiResponseFormatType, OpenAiResponseInput,
    OpenAiResponseInputContent, OpenAiResponseInputContentPartType,
    OpenAiResponseOutputContentType, OpenAiResponseOutputItemType, OpenAiResponseStatus,
    OpenAiResponsesRequest, OpenAiResponsesResponse, OpenAiSchemaType, OpenAiServiceTier,
    OpenAiToolChoice, OpenAiToolChoiceMode, OpenAiToolType, OpenAiTruncationStrategy,
};

#[test]
fn chat_completion_contract_defines_standard_request_and_response_fields() {
    let request: OpenAiChatCompletionRequest = serde_json::from_value(serde_json::json!({
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "system",
                "content": "Use terse answers."
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image"},
                    {"type": "image_url", "image_url": {"url": "https://example.com/image.png"}}
                ]
            }
        ],
        "temperature": 0.2,
        "max_tokens": 128,
        "stream": false,
        "metadata": {"tenant": "demo"},
        "provider_extension": {"routing": "regional"}
    }))
    .unwrap();

    assert_eq!("gpt-4o-mini", request.model);
    assert_eq!(2, request.messages.len());
    assert_eq!(Some(false), request.stream);
    assert_eq!(
        "regional",
        request
            .extra
            .get("provider_extension")
            .unwrap()
            .get("routing")
            .unwrap()
    );
    assert!(request.to_provider_json().get("messages").is_some());

    let response: OpenAiChatCompletionResponse = serde_json::from_value(serde_json::json!({
        "id": "chatcmpl_123",
        "object": "chat.completion",
        "created": 1710000000,
        "model": "gpt-4o-mini",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": "ok"},
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 8,
            "completion_tokens": 2,
            "total_tokens": 10,
            "prompt_tokens_details": {"cached_tokens": 1}
        }
    }))
    .unwrap();

    assert_eq!("chatcmpl_123", response.id);
    assert_eq!("chat.completion", response.object);
    assert_eq!(1, response.choices.len());
    assert_eq!(10, response.usage.unwrap().total_tokens);
}

#[test]
fn chat_completion_contract_strongly_types_standard_nested_fields() {
    let request: OpenAiChatCompletionRequest = serde_json::from_value(serde_json::json!({
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image"},
                    {"type": "image_url", "image_url": {"url": "https://example.com/image.png", "detail": "high"}},
                    {"type": "input_audio", "input_audio": {"data": "base64-audio", "format": "wav"}},
                    {"type": "file", "file": {"file_id": "file_123"}}
                ]
            }
        ],
        "response_format": {"type": "json_object"},
        "service_tier": "default",
        "tool_choice": "auto",
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "lookup",
                    "description": "Lookup a record.",
                    "parameters": {
                        "type": "object",
                        "properties": {"id": {"type": "string"}},
                        "required": ["id"],
                        "additionalProperties": false
                    },
                    "strict": true
                }
            }
        ]
    }))
    .unwrap();

    assert_eq!(OpenAiChatMessageRole::User, request.messages[0].role);
    let content = request.messages[0].content.as_ref().unwrap();
    let OpenAiChatMessageContent::Parts(parts) = content else {
        panic!("expected typed multimodal chat content parts");
    };
    assert_eq!(OpenAiChatContentPartType::Text, parts[0].part_type);
    assert_eq!(OpenAiChatContentPartType::ImageUrl, parts[1].part_type);
    assert_eq!(
        "https://example.com/image.png",
        parts[1].image_url.as_ref().unwrap().url
    );
    assert_eq!(
        "high",
        parts[1]
            .image_url
            .as_ref()
            .unwrap()
            .detail
            .as_deref()
            .unwrap()
    );
    assert_eq!(OpenAiChatContentPartType::InputAudio, parts[2].part_type);
    assert_eq!("wav", parts[2].input_audio.as_ref().unwrap().format);
    assert_eq!(OpenAiChatContentPartType::File, parts[3].part_type);
    assert_eq!(
        "file_123",
        parts[3].file.as_ref().unwrap().file_id.as_deref().unwrap()
    );

    assert_eq!(
        OpenAiResponseFormatType::JsonObject,
        request.response_format.as_ref().unwrap().format_type
    );
    assert_eq!(Some(OpenAiServiceTier::Default), request.service_tier);
    assert_eq!(
        OpenAiToolChoice::Mode(OpenAiToolChoiceMode::Auto),
        request.tool_choice.unwrap()
    );
    let tool = request.tools.as_ref().unwrap().first().unwrap();
    assert_eq!(OpenAiToolType::Function, tool.tool_type);
    assert_eq!("lookup", tool.function.as_ref().unwrap().name);
    assert_eq!(Some(true), tool.function.as_ref().unwrap().strict);
    assert_eq!(
        Some(OpenAiJsonSchemaAdditionalProperties::Boolean(false)),
        tool.function
            .as_ref()
            .unwrap()
            .parameters
            .as_ref()
            .unwrap()
            .additional_properties
    );
}

#[test]
fn responses_contract_defines_multimodal_input_and_output_items() {
    let request: OpenAiResponsesRequest = serde_json::from_value(serde_json::json!({
        "model": "gpt-4.1-mini",
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "Summarize"},
                    {"type": "input_image", "image_url": "https://example.com/chart.png"}
                ]
            }
        ],
        "instructions": "Return JSON.",
        "max_output_tokens": 256,
        "stream": false,
        "text": {"format": {"type": "json_object"}}
    }))
    .unwrap();

    assert_eq!("gpt-4.1-mini", request.model);
    assert_eq!(Some(false), request.stream);
    assert!(request.to_provider_json().get("input").is_some());

    let response: OpenAiResponsesResponse = serde_json::from_value(serde_json::json!({
        "id": "resp_123",
        "object": "response",
        "created_at": 1710000000,
        "status": "completed",
        "model": "gpt-4.1-mini",
        "output": [
            {
                "id": "msg_123",
                "type": "message",
                "role": "assistant",
                "status": "completed",
                "content": [{"type": "output_text", "text": "ok"}]
            }
        ],
        "usage": {
            "input_tokens": 12,
            "output_tokens": 3,
            "total_tokens": 15
        }
    }))
    .unwrap();

    assert_eq!("resp_123", response.id);
    assert_eq!(OpenAiResponseStatus::Completed, response.status.unwrap());
    assert_eq!(1, response.output.len());
    assert_eq!(15, response.usage.unwrap().total_tokens);
}

#[test]
fn responses_contract_strongly_types_input_output_and_text_format() {
    let request: OpenAiResponsesRequest = serde_json::from_value(serde_json::json!({
        "model": "gpt-4.1-mini",
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "Summarize"},
                    {"type": "input_image", "image_url": "https://example.com/chart.png", "detail": "high"},
                    {"type": "input_file", "file_id": "file_123"}
                ]
            }
        ],
        "reasoning": {"effort": "medium", "summary": "auto"},
        "text": {"format": {"type": "json_object"}},
        "tool_choice": "required",
        "service_tier": "flex",
        "truncation": "auto",
        "tools": [
            {
                "type": "function",
                "function": {"name": "lookup", "parameters": {"type": "object"}}
            }
        ]
    }))
    .unwrap();

    let OpenAiResponseInput::Items(items) = &request.input else {
        panic!("expected typed response input items");
    };
    let OpenAiResponseInputContent::Parts(parts) = items[0].content.as_ref().unwrap() else {
        panic!("expected typed response input content parts");
    };
    assert_eq!(
        OpenAiResponseInputContentPartType::InputText,
        parts[0].part_type
    );
    assert_eq!("Summarize", parts[0].text.as_deref().unwrap());
    assert_eq!(
        OpenAiResponseInputContentPartType::InputImage,
        parts[1].part_type
    );
    assert_eq!(
        "https://example.com/chart.png",
        parts[1].image_url.as_deref().unwrap()
    );
    assert_eq!("high", parts[1].detail.as_deref().unwrap());
    assert_eq!(
        OpenAiResponseInputContentPartType::InputFile,
        parts[2].part_type
    );
    assert_eq!("file_123", parts[2].file_id.as_deref().unwrap());
    assert_eq!(
        &OpenAiReasoningEffort::Medium,
        request.reasoning.as_ref().unwrap().effort.as_ref().unwrap()
    );
    assert_eq!(
        Some(OpenAiReasoningSummary::Auto),
        request.reasoning.as_ref().unwrap().summary
    );
    assert_eq!(Some(OpenAiServiceTier::Flex), request.service_tier);
    assert_eq!(Some(OpenAiTruncationStrategy::Auto), request.truncation);
    assert_eq!(
        OpenAiResponseFormatType::JsonObject,
        request
            .text
            .as_ref()
            .unwrap()
            .format
            .as_ref()
            .unwrap()
            .format_type
    );
    assert_eq!(
        OpenAiToolChoice::Mode(OpenAiToolChoiceMode::Required),
        request.tool_choice.unwrap()
    );
    assert_eq!(
        OpenAiToolType::Function,
        request.tools.as_ref().unwrap()[0].tool_type
    );

    let response: OpenAiResponsesResponse = serde_json::from_value(serde_json::json!({
        "id": "resp_123",
        "object": "response",
        "status": "incomplete",
        "model": "gpt-4.1-mini",
        "output": [
            {
                "id": "msg_123",
                "type": "message",
                "role": "assistant",
                "content": [
                    {
                        "type": "output_text",
                        "text": "ok",
                        "annotations": [
                            {"type": "file_citation", "file_id": "file_123", "index": 0}
                        ]
                    }
                ]
            }
        ],
        "incomplete_details": {"reason": "max_output_tokens"},
        "usage": {
            "input_tokens": 12,
            "output_tokens": 3,
            "total_tokens": 15,
            "input_tokens_details": {"cached_tokens": 4},
            "output_tokens_details": {"reasoning_tokens": 1}
        }
    }))
    .unwrap();

    assert_eq!(OpenAiResponseStatus::Incomplete, response.status.unwrap());
    assert_eq!(
        OpenAiResponseOutputItemType::Message,
        response.output[0].item_type
    );
    assert_eq!(
        OpenAiResponseOutputContentType::OutputText,
        response.output[0].content[0].content_type
    );
    assert_eq!(
        OpenAiIncompleteReason::MaxOutputTokens,
        response.incomplete_details.as_ref().unwrap().reason
    );
    assert_eq!(
        Some(4),
        response
            .usage
            .as_ref()
            .unwrap()
            .input_tokens_details
            .as_ref()
            .unwrap()
            .cached_tokens
    );
    assert_eq!(
        Some(1),
        response
            .usage
            .as_ref()
            .unwrap()
            .output_tokens_details
            .as_ref()
            .unwrap()
            .reasoning_tokens
    );
    assert_eq!(
        "file_123",
        response.output[0].content[0].annotations[0]
            .file_id
            .as_deref()
            .unwrap()
    );
    assert_eq!(
        OpenAiAnnotationType::FileCitation,
        response.output[0].content[0].annotations[0].annotation_type
    );
}

#[test]
fn responses_contract_rejects_untyped_object_input() {
    let error = serde_json::from_value::<OpenAiResponsesRequest>(serde_json::json!({
        "model": "gpt-4.1-mini",
        "input": {"unexpected": "free-form object"}
    }))
    .unwrap_err();

    assert!(
        error.to_string().contains("data did not match any variant"),
        "unexpected error: {error}"
    );
}

#[test]
fn embeddings_contract_defines_input_dimensions_encoding_and_embedding_list() {
    let request: OpenAiEmbeddingsRequest = serde_json::from_value(serde_json::json!({
        "model": "text-embedding-3-small",
        "input": ["hello", "world"],
        "encoding_format": "float",
        "dimensions": 256,
        "user": "user_123"
    }))
    .unwrap();

    assert_eq!("text-embedding-3-small", request.model);
    assert_eq!(
        Some(OpenAiEmbeddingEncodingFormat::Float),
        request.encoding_format
    );
    assert_eq!(Some(256), request.dimensions);
    assert!(request.to_provider_json().get("input").is_some());

    let response: OpenAiEmbeddingList = serde_json::from_value(serde_json::json!({
        "object": "list",
        "model": "text-embedding-3-small",
        "data": [
            {"object": "embedding", "index": 0, "embedding": [0.1, 0.2, 0.3]}
        ],
        "usage": {"prompt_tokens": 2, "total_tokens": 2}
    }))
    .unwrap();

    assert_eq!("list", response.object);
    assert_eq!(1, response.data.len());
    assert_eq!(
        OpenAiEmbeddingVector::Float(vec![0.1, 0.2, 0.3]),
        response.data[0].embedding
    );
    assert_eq!(2, response.usage.total_tokens);
}

#[test]
fn error_envelope_contract_matches_official_openai_error_shape() {
    // The official OpenAI error envelope serializes exactly:
    //   {"error": {"message", "type", "param", "code"}}
    // SDK clients match on `error.type` (authentication_error,
    // rate_limit_error, invalid_request_error, server_error, ...).
    let envelope: OpenAiErrorEnvelope = serde_json::from_value(serde_json::json!({
        "error": {
            "message": "Incorrect API key provided",
            "type": "authentication_error",
            "param": null,
            "code": "invalid_api_key"
        }
    }))
    .unwrap();

    assert_eq!("Incorrect API key provided", envelope.error.message);
    assert_eq!("authentication_error", envelope.error.error_type);
    assert_eq!(None, envelope.error.param);
    assert_eq!("invalid_api_key", envelope.error.code);

    let serialized = serde_json::to_value(&envelope).unwrap();
    assert_eq!(
        "authentication_error", serialized["error"]["type"],
        "error type must serialize under the official `type` field name"
    );
    assert_eq!("invalid_api_key", serialized["error"]["code"]);
    assert!(serialized["error"]["param"].is_null());
    assert!(serialized["error"].get("message").is_some());
    assert_eq!(
        OpenAiErrorBody {
            message: "Incorrect API key provided".to_owned(),
            error_type: "authentication_error".to_owned(),
            param: None,
            code: "invalid_api_key".to_owned(),
            extra: Default::default(),
        },
        envelope.error
    );
}

// ---------------------------------------------------------------------------
// Request-tolerance regression corpus.
//
// Cloud Router relays the caller's raw body and validates it through these
// typed contracts on the way in. A contract narrower than the wire format
// therefore turns a vendor-compatible request into a pre-routing 400: the
// 50301 incident of 2026-11-09 was exactly that (schemars rendering Option<T>
// as {"type": ["string","null"]}). Each test below pins one legal shape that a
// real client emits.
// ---------------------------------------------------------------------------

/// The curated agents chat toolkit ships schemars-generated tool schemas, and
/// schemars 1.x renders every `Option<T>` as the draft-2020-12 union `type`
/// form. This is the exact production body that used to fail with
/// `invalid request body: invalid type: sequence, expected a string`.
#[test]
fn chat_request_accepts_nullable_json_schema_union_types_in_tool_parameters() {
    let request: OpenAiChatCompletionRequest = serde_json::from_value(serde_json::json!({
        "model": "deepseek-flash",
        "stream": true,
        "messages": [{"role": "user", "content": "hi"}],
        "tools": [{
            "type": "function",
            "function": {
                "name": "mcp__generations__image.create",
                "description": "Generate images.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string"},
                        "vendor": {"type": ["string", "null"]},
                        "imageCount": {"type": ["integer", "null"]},
                        "referenceImages": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["prompt"]
                }
            }
        }],
        "tool_choice": "auto",
        "parallel_tool_calls": false
    }))
    .expect("a nullable tool schema is legal JSON Schema");

    let tool = request.tools.as_ref().unwrap().first().unwrap();
    let parameters = tool.function.as_ref().unwrap().parameters.as_ref().unwrap();
    assert_eq!(
        parameters.schema_type.as_ref().map(OpenAiSchemaType::names),
        Some(vec!["object"])
    );
    let properties = parameters.properties.as_ref().unwrap();
    assert_eq!(
        properties["vendor"]
            .schema_type
            .as_ref()
            .map(OpenAiSchemaType::names),
        Some(vec!["string", "null"])
    );
    assert_eq!(
        properties["imageCount"]
            .schema_type
            .as_ref()
            .map(OpenAiSchemaType::names),
        Some(vec!["integer", "null"])
    );
}

/// Chat Completions carries every documented optional field; a client that uses
/// them all must not be rejected, and assistant/tool message fidelity
/// (`tool_calls`, `tool_call_id`, null content) must survive parsing.
#[test]
fn chat_request_accepts_every_documented_optional_field() {
    let request: OpenAiChatCompletionRequest = serde_json::from_value(serde_json::json!({
        "model": "gpt-4o",
        "messages": [
            {"role": "system", "content": "s"},
            {"role": "user", "content": [{"type": "text", "text": "hi"}]},
            {
                "role": "assistant",
                "content": null,
                "reasoning_content": "thinking",
                "tool_calls": [{
                    "id": "call_1",
                    "type": "function",
                    "function": {"name": "lookup", "arguments": "{\"id\":\"1\"}"}
                }]
            },
            {"role": "tool", "tool_call_id": "call_1", "content": "{\"ok\":true}"}
        ],
        "stream": true,
        "stream_options": {"include_usage": true},
        "stop": ["A", "B"],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "answer",
                "strict": true,
                "schema": {
                    "type": "object",
                    "properties": {"value": {"type": ["string", "null"]}}
                }
            }
        },
        "prediction": {"type": "content", "content": "draft"},
        "modalities": ["text"],
        "audio": {"voice": "alloy", "format": "wav"},
        "logit_bias": {"50256": -100},
        "metadata": {"trace": "1"},
        "service_tier": "auto",
        "reasoning_effort": "high",
        "tool_choice": "required",
        "tools": [{
            "type": "function",
            "function": {"name": "lookup", "parameters": {"type": "array", "items": {"type": ["string", "null"]}}}
        }],
        "logprobs": true,
        "top_logprobs": 2,
        "seed": 7,
        "n": 1,
        "user": "u",
        "vendor_flag": true
    }))
    .unwrap();

    assert_eq!(4, request.messages.len());
    assert_eq!(OpenAiChatMessageRole::Tool, request.messages[3].role);
    assert_eq!(Some("call_1"), request.messages[3].tool_call_id.as_deref());
    assert_eq!(Some(2), request.top_logprobs);
    assert_eq!(Some(7), request.seed);
    assert!(request.extra.contains_key("vendor_flag"));
    let parameters = request.tools.as_ref().unwrap()[0]
        .function
        .as_ref()
        .unwrap()
        .parameters
        .as_ref()
        .unwrap();
    assert!(matches!(
        parameters.items.as_ref().unwrap(),
        OpenAiJsonSchemaItems::Single(_)
    ));
}

/// `items` is one schema per element, or - in the draft-07 tuple form - one
/// schema per position.
#[test]
fn json_schema_items_accepts_single_and_tuple_forms() {
    let request: OpenAiChatCompletionRequest = serde_json::from_value(serde_json::json!({
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "hi"}],
        "tools": [{
            "type": "function",
            "function": {
                "name": "pair",
                "parameters": {"type": "array", "items": [{"type": "string"}, {"type": "integer"}]}
            }
        }]
    }))
    .unwrap();

    let parameters = request.tools.as_ref().unwrap()[0]
        .function
        .as_ref()
        .unwrap()
        .parameters
        .as_ref()
        .unwrap();
    let OpenAiJsonSchemaItems::Tuple(items) = parameters.items.as_ref().unwrap() else {
        panic!("expected tuple-form items");
    };
    assert_eq!(2, items.len());
}

/// Tool kinds grow by extension (`custom` for freeform tools, `web_search`,
/// `local_shell`, ...). Unknown kinds must parse and round-trip verbatim.
#[test]
fn tool_kinds_accept_extensions_and_round_trip() {
    let request: OpenAiChatCompletionRequest = serde_json::from_value(serde_json::json!({
        "model": "gpt-5",
        "messages": [{"role": "user", "content": "hi"}],
        "tools": [
            {"type": "function", "function": {"name": "lookup", "parameters": {"type": "object"}}},
            {"type": "custom", "custom": {"name": "apply_patch", "description": "patch"}},
            {"type": "web_search"}
        ],
        "tool_choice": {"type": "function", "function": {"name": "lookup"}}
    }))
    .unwrap();

    let tools = request.tools.as_ref().unwrap();
    assert_eq!(OpenAiToolType::Function, tools[0].tool_type);
    assert_eq!(
        OpenAiToolType::Other("custom".to_owned()),
        tools[1].tool_type
    );
    assert_eq!("custom", tools[1].tool_type.as_str());
    assert_eq!("web_search", tools[2].tool_type.as_str());
    assert_eq!(
        serde_json::json!("custom"),
        serde_json::to_value(&tools[1].tool_type).unwrap(),
        "an extension tool kind must serialize back verbatim"
    );

    let OpenAiToolChoice::Tool(choice) = request.tool_choice.unwrap() else {
        panic!("expected a named tool choice");
    };
    assert_eq!(Some("lookup"), choice.tool_name());
}

/// Vendor-published service tiers and reasoning levels move with the model
/// line; a value outside the documented set must still reach routing instead of
/// failing validation.
#[test]
fn vendor_enumerated_values_accept_unknown_levels() {
    let responses: OpenAiResponsesRequest = serde_json::from_value(serde_json::json!({
        "model": "gpt-5-codex",
        "input": "hi",
        "service_tier": "scale",
        "reasoning": {"effort": "xhigh", "summary": "auto"}
    }))
    .unwrap();

    assert_eq!(
        Some(OpenAiServiceTier::Other("scale".to_owned())),
        responses.service_tier
    );
    assert_eq!(
        Some(&OpenAiReasoningEffort::Other("xhigh".to_owned())),
        responses.reasoning.as_ref().unwrap().effort.as_ref()
    );
    assert_eq!(
        Some("xhigh"),
        responses
            .reasoning
            .as_ref()
            .unwrap()
            .effort
            .as_ref()
            .map(OpenAiReasoningEffort::as_str)
    );
}

/// Turn 2+ of an `openai_responses` conversation feeds the model's own
/// `output_text` parts back inside `input`; the agents transport emits exactly
/// this body, so rejecting it broke every follow-up turn.
#[test]
fn responses_request_accepts_assistant_output_text_history() {
    let request: OpenAiResponsesRequest = serde_json::from_value(serde_json::json!({
        "model": "deepseek-flash",
        "stream": true,
        "instructions": "You are helpful.",
        "input": [
            {"role": "user", "content": [{"type": "input_text", "text": "hi"}]},
            {"role": "assistant", "content": [{"type": "output_text", "text": "hello"}]},
            {"role": "user", "content": [{"type": "input_text", "text": "again"}]}
        ]
    }))
    .expect("assistant history round-trips through output_text parts");

    let OpenAiResponseInput::Items(items) = &request.input else {
        panic!("expected typed response input items");
    };
    assert_eq!(3, items.len());
    let OpenAiResponseInputContent::Parts(parts) = items[1].content.as_ref().unwrap() else {
        panic!("expected typed response input content parts");
    };
    assert_eq!(
        OpenAiResponseInputContentPartType::OutputText,
        parts[0].part_type
    );
    assert_eq!(Some("hello"), parts[0].text.as_deref());
    assert_eq!(Some("You are helpful."), request.instructions.as_deref());
}

/// Responses tools: chat-shaped nested functions, the flat function form, and
/// the built-in kinds a Codex-class client sends (`web_search`, `file_search`,
/// `local_shell`, `custom`, `mcp`).
#[test]
fn responses_request_accepts_builtin_tool_kinds_and_flat_function_tools() {
    let request: OpenAiResponsesRequest = serde_json::from_value(serde_json::json!({
        "model": "gpt-5-codex",
        "input": "hi",
        "tools": [
            {"type": "function", "function": {"name": "nested", "parameters": {"type": "object"}}},
            {"type": "function", "name": "lookup", "parameters": {"type": "object"}, "strict": true},
            {"type": "web_search"},
            {"type": "file_search", "vector_store_ids": ["vs_1"]},
            {"type": "local_shell"},
            {"type": "custom", "custom": {"name": "apply_patch", "format": {"type": "text"}}},
            {"type": "mcp", "server_label": "docs", "server_url": "https://example.com/mcp"}
        ],
        "tool_choice": {"type": "function", "name": "lookup"}
    }))
    .unwrap();

    let tools = request.tools.as_ref().unwrap();
    assert_eq!(7, tools.len());
    assert_eq!(Some("nested"), tools[0].function_name());
    assert_eq!(Some("lookup"), tools[1].function_name());
    assert_eq!(Some(true), tools[1].strict);
    assert_eq!("web_search", tools[2].tool_type.as_str());
    assert_eq!(Some("vs_1"), tools[3].extra["vector_store_ids"][0].as_str());
    assert_eq!("local_shell", tools[4].tool_type.as_str());
    assert_eq!("custom", tools[5].tool_type.as_str());
    assert_eq!("mcp", tools[6].tool_type.as_str());
    assert_eq!(Some("docs"), tools[6].extra["server_label"].as_str());

    let OpenAiToolChoice::Tool(choice) = request.tool_choice.unwrap() else {
        panic!("expected a named tool choice");
    };
    assert_eq!(Some("lookup"), choice.tool_name());

    let builtin_choice: OpenAiResponsesRequest = serde_json::from_value(serde_json::json!({
        "model": "gpt-5-codex",
        "input": "hi",
        "tool_choice": {"type": "web_search"}
    }))
    .unwrap();
    let OpenAiToolChoice::Tool(choice) = builtin_choice.tool_choice.unwrap() else {
        panic!("expected a named built-in tool choice");
    };
    assert_eq!("web_search", choice.tool_type.as_str());
    assert_eq!(None, choice.tool_name());
}

/// Embeddings accepts every documented input form (string, string array, token
/// array, token arrays) plus unknown vendor fields.
#[test]
fn embeddings_request_accepts_every_documented_input_form() {
    let request: OpenAiEmbeddingsRequest = serde_json::from_value(serde_json::json!({
        "model": "text-embedding-3-small",
        "input": [[1, 2, 3], [4, 5]],
        "encoding_format": "base64",
        "dimensions": 512,
        "user": "u",
        "provider_extension": {"a": 1}
    }))
    .unwrap();

    assert!(matches!(
        request.input,
        OpenAiEmbeddingInput::TokenArrayArray(_)
    ));
    assert_eq!(
        Some(OpenAiEmbeddingEncodingFormat::Base64),
        request.encoding_format
    );
    assert_eq!(Some(512), request.dimensions);
    assert!(request.extra.contains_key("provider_extension"));
}
