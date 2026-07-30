use sdkwork_clawrouter_router_service::application::{
    StreamingUsageAccumulator, StreamingUsageFormat,
};

#[test]
fn responses_completed_sse_extracts_nested_usage_across_transport_frames() {
    let mut accumulator = StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);

    accumulator
        .observe(
            b"event: response.completed\ndata: {\"type\":\"response.completed\",\"response\":{\"id\":\"resp_1\",\"usage\":{\"input_to",
        )
        .unwrap();
    accumulator
        .observe(b"kens\":4,\"output_tokens\":3,\"total_tokens\":7}}}\n\n")
        .unwrap();

    let usage_body = accumulator
        .finish()
        .unwrap()
        .expect("Responses terminal event must expose usage");
    assert_eq!(1, usage_body.as_object().unwrap().len());
    assert!(usage_body.get("id").is_none());
    assert_eq!(
        Some(4),
        usage_body
            .pointer("/usage/input_tokens")
            .and_then(|v| v.as_i64())
    );
    assert_eq!(
        Some(3),
        usage_body
            .pointer("/usage/output_tokens")
            .and_then(|v| v.as_i64())
    );
    assert_eq!(
        Some(7),
        usage_body
            .pointer("/usage/total_tokens")
            .and_then(|v| v.as_i64())
    );
}

#[test]
fn later_root_usage_event_replaces_an_earlier_responses_usage_event() {
    let mut accumulator = StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);

    accumulator
        .observe(
            b"data: {\"type\":\"response.completed\",\"response\":{\"usage\":{\"input_tokens\":1,\"output_tokens\":1}}}\n\ndata: {\"usage\":{\"prompt_tokens\":5,\"completion_tokens\":8}}\n\n",
        )
        .unwrap();

    let usage_body = accumulator.finish().unwrap().unwrap();
    assert_eq!(
        Some(5),
        usage_body
            .pointer("/usage/prompt_tokens")
            .and_then(|v| v.as_i64())
    );
    assert_eq!(
        Some(8),
        usage_body
            .pointer("/usage/completion_tokens")
            .and_then(|v| v.as_i64())
    );
}
