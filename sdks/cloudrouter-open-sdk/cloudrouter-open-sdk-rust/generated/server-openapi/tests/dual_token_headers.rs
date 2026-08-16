//! Regression test: dual-token (Authorization + Access-Token) request headers.
//!
//! Agents backends call `/v1/chat/completions` with the caller's auth token
//! and access token (API_SPEC §819/§824). `set_auth_token` followed by
//! `set_access_token` must keep BOTH headers on the wire — a previous SDK
//! defect made `set_access_token` remove the `Authorization` bearer, which the
//! gateway rejected with `401 missing api key credential`.

use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use std::sync::{Arc, Mutex};
use std::thread;

use cloudrouter_open_sdk::models::{OpenAiChatCompletionRequest, OpenAiChatMessage};
use cloudrouter_open_sdk::{SdkworkAiClient, SdkworkConfig};

fn chat_request() -> OpenAiChatCompletionRequest {
    OpenAiChatCompletionRequest {
        model: "default".to_string(),
        messages: vec![OpenAiChatMessage {
            role: "user".to_string(),
            content: Some("ping".to_string()),
            ..Default::default()
        }],
        stream: Some(false),
        ..Default::default()
    }
}

fn openai_completion_body() -> &'static str {
    r#"{"id":"chatcmpl-test","object":"chat.completion","created":1750000000,"model":"default","choices":[{"index":0,"message":{"role":"assistant","content":"pong"},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}"#
}

/// Starts a loopback HTTP server that records the request headers of the next
/// request and replies with an OpenAI chat completion.
fn spawn_header_recording_server() -> (String, Arc<Mutex<Option<(String, String)>>>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind loopback");
    let addr = listener.local_addr().expect("local addr");
    let recorded: Arc<Mutex<Option<(String, String)>>> = Arc::new(Mutex::new(None));
    let recorder = Arc::clone(&recorded);
    thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept");
        let mut reader = BufReader::new(stream.try_clone().expect("clone stream"));
        let mut head = String::new();
        loop {
            let mut line = String::new();
            let read = reader.read_line(&mut line).expect("read line");
            if read == 0 || line == "\r\n" || line == "\n" {
                break;
            }
            head.push_str(&line);
        }
        let mut authorization = None;
        let mut access_token = None;
        for line in head.lines() {
            if let Some((name, value)) = line.split_once(':') {
                let name = name.trim().to_ascii_lowercase();
                let value = value.trim().to_string();
                if name == "authorization" {
                    authorization = Some(value);
                } else if name == "access-token" {
                    access_token = Some(value);
                }
            }
        }
        *recorder.lock().expect("recorder lock") = Some((
            authorization.unwrap_or_default(),
            access_token.unwrap_or_default(),
        ));
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            openai_completion_body().len(),
            openai_completion_body()
        );
        stream.write_all(response.as_bytes()).expect("write");
        stream.flush().expect("flush");
    });
    (format!("http://{addr}"), recorded)
}

#[tokio::test]
async fn dual_tokens_are_both_sent_when_access_token_is_set_after_auth_token() {
    let (base_url, recorded) = spawn_header_recording_server();

    let mut config = SdkworkConfig::new(base_url);
    config.timeout_ms = 5_000;
    let client = SdkworkAiClient::new(config).expect("client");

    // Order used by the agents chat turn executors: access token first, then
    // the auth token bearer. Both headers must reach the gateway.
    client.set_access_token("access-123");
    client.set_auth_token("auth-456");

    let completion = client.chat().create(&chat_request()).await.expect("chat");
    assert_eq!(completion.model, "default");
    assert_eq!(
        completion
            .choices
            .first()
            .and_then(|choice| choice.message.content.as_deref()),
        Some("pong")
    );

    let (authorization, access_token) = recorded
        .lock()
        .expect("recorded lock")
        .clone()
        .expect("headers recorded");
    assert_eq!(authorization, "Bearer auth-456", "Authorization bearer must be present");
    assert_eq!(access_token, "access-123", "Access-Token must be present");
}

#[tokio::test]
async fn dual_tokens_are_both_sent_with_auth_token_first_then_access_token() {
    let (base_url, recorded) = spawn_header_recording_server();

    let mut config = SdkworkConfig::new(base_url);
    config.timeout_ms = 5_000;
    let client = SdkworkAiClient::new(config).expect("client");

    // The other documented order (auth token first, access token second) must
    // also keep both headers — this was the original defect.
    client.set_auth_token("auth-456");
    client.set_access_token("access-123");

    client.chat().create(&chat_request()).await.expect("chat");

    let (authorization, access_token) = recorded
        .lock()
        .expect("recorded lock")
        .clone()
        .expect("headers recorded");
    assert_eq!(authorization, "Bearer auth-456", "Authorization bearer must be present");
    assert_eq!(access_token, "access-123", "Access-Token must be present");
}
