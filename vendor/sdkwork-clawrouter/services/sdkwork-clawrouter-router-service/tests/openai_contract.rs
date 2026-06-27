use sdkwork_clawrouter_router_service::api::openai_contract::{
    OpenAiAnnotationType, OpenAiChatCompletionRequest, OpenAiChatCompletionResponse,
    OpenAiChatContentPartType, OpenAiChatMessageContent, OpenAiChatMessageRole,
    OpenAiEmbeddingEncodingFormat, OpenAiEmbeddingList, OpenAiEmbeddingVector,
    OpenAiEmbeddingsRequest, OpenAiIncompleteReason, OpenAiJsonSchemaAdditionalProperties,
    OpenAiReasoningEffort, OpenAiReasoningSummary, OpenAiResponseFormatType, OpenAiResponseInput,
    OpenAiResponseInputContent, OpenAiResponseInputContentPartType,
    OpenAiResponseOutputContentType, OpenAiResponseOutputItemType, OpenAiResponseStatus,
    OpenAiResponsesRequest, OpenAiResponsesResponse, OpenAiServiceTier, OpenAiToolChoice,
    OpenAiToolChoiceMode, OpenAiToolType, OpenAiTruncationStrategy,
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
        OpenAiReasoningEffort::Medium,
        request.reasoning.as_ref().unwrap().effort.unwrap()
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
