//! Real-socket verification of Adaptive Web static delivery.
//!
//! `SDKWORK_DEPLOY_SPEC.md` section 8 makes the standalone gateway the process
//! plane that selects the PC or H5 SPA by device class and collapses onto the
//! other surface when the preferred one is not packaged. The in-crate unit tests
//! in `portal::tests` and `adaptive_surface::tests` cover the classifier and the
//! selector directly; this file covers what they cannot: the production wiring
//! (environment keys -> `PortalStaticConfig` -> mounted Router -> response
//! headers) driven over a real loopback socket.
//!
//! Run with `cargo test -p sdkwork-api-cloudrouter-standalone-gateway --test adaptive_static_delivery`.

use std::net::{Ipv4Addr, SocketAddr};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use axum::routing::get;
use axum::Router;
use sdkwork_api_cloudrouter_standalone_gateway::portal::{
    mount_portal_static, PortalStaticConfig, H5_STATIC_ROOT_ENV, PC_STATIC_ROOT_ENV,
};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

const DESKTOP_UA: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MOBILE_UA: &str =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const IPAD_UA: &str = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

fn fixture_root(label: &str) -> PathBuf {
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock")
        .as_nanos();
    std::env::temp_dir().join(format!("cloudrouter-adaptive-{label}-{suffix}"))
}

/// A packaged SPA surface: `index.html` plus one asset, which is the minimum the
/// loader validates before it is willing to serve the lane.
fn write_surface(root: &Path, surface: &str) {
    std::fs::create_dir_all(root.join("assets")).expect("create surface");
    std::fs::write(
        root.join("index.html"),
        format!(
            r#"<div id="root" data-surface="{surface}"></div><script type="module" src="/assets/app.js"></script>"#
        ),
    )
    .expect("write index");
    std::fs::write(
        root.join("assets/app.js"),
        format!("console.log('{surface}');"),
    )
    .expect("write asset");
}

async fn spawn_gateway(
    portal: Option<PortalStaticConfig>,
) -> (SocketAddr, tokio::task::JoinHandle<()>) {
    let api = Router::new().route("/v1/ping", get(|| async { "pong" }));
    let app = mount_portal_static(api, portal);
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0))
        .await
        .expect("bind loopback");
    let address = listener.local_addr().expect("listener address");
    let handle = tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    (address, handle)
}

struct HttpResponse {
    status: u16,
    headers: Vec<(String, String)>,
    body: String,
}

impl HttpResponse {
    fn header(&self, name: &str) -> Option<&str> {
        self.headers
            .iter()
            .find(|(key, _)| key.eq_ignore_ascii_case(name))
            .map(|(_, value)| value.as_str())
    }
}

/// Minimal HTTP/1.1 client. The crate has no HTTP client dependency, and the
/// point of this file is to exercise the real socket, so a hand-rolled request
/// plus a de-chunker keeps the check dependency-free.
async fn issue_request(address: SocketAddr, path: &str, headers: &[(&str, &str)]) -> HttpResponse {
    let mut stream = TcpStream::connect(address).await.expect("connect");
    let mut request = format!("GET {path} HTTP/1.1\r\nHost: {address}\r\nConnection: close\r\n");
    for (name, value) in headers {
        request.push_str(&format!("{name}: {value}\r\n"));
    }
    request.push_str("\r\n");
    stream
        .write_all(request.as_bytes())
        .await
        .expect("write request");
    let mut raw = Vec::new();
    stream.read_to_end(&mut raw).await.expect("read response");

    let split = raw
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .expect("response head terminator");
    let head = String::from_utf8_lossy(&raw[..split]).to_string();
    let mut lines = head.split("\r\n");
    let status = lines
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|code| code.parse::<u16>().ok())
        .expect("status line");
    let headers = lines
        .filter_map(|line| line.split_once(':'))
        .map(|(name, value)| (name.trim().to_owned(), value.trim().to_owned()))
        .collect::<Vec<_>>();
    let mut payload = raw[split + 4..].to_vec();
    if headers.iter().any(|(name, value)| {
        name.eq_ignore_ascii_case("transfer-encoding") && value.contains("chunked")
    }) {
        payload = dechunk(&payload);
    }
    HttpResponse {
        status,
        headers,
        body: String::from_utf8_lossy(&payload).to_string(),
    }
}

fn dechunk(mut payload: &[u8]) -> Vec<u8> {
    let mut out = Vec::new();
    loop {
        let Some(break_at) = payload.windows(2).position(|window| window == b"\r\n") else {
            return out;
        };
        let size_text = String::from_utf8_lossy(&payload[..break_at]);
        let size = usize::from_str_radix(size_text.trim(), 16).unwrap_or(0);
        if size == 0 {
            return out;
        }
        let start = break_at + 2;
        out.extend_from_slice(&payload[start..start + size]);
        payload = &payload[start + size..];
        payload = payload
            .strip_prefix(b"\r\n")
            .or_else(|| payload.strip_prefix(b"\n"))
            .unwrap_or(payload);
    }
}

#[tokio::test]
async fn environment_keys_drive_the_packaged_surfaces() {
    let pc_root = fixture_root("env-pc");
    let h5_root = fixture_root("env-h5");
    write_surface(&pc_root, "pc");
    write_surface(&h5_root, "h5");
    // This is the production key pair the install package and topology declare
    // (`specs/topology.spec.json` runtimeRootEnv). Setting them before the first
    // await leaves no other thread running, which is what makes this sound.
    unsafe {
        std::env::set_var(PC_STATIC_ROOT_ENV, &pc_root);
        std::env::set_var(H5_STATIC_ROOT_ENV, &h5_root);
    }

    let config = PortalStaticConfig::from_env_and_runtime(None)
        .expect("env config")
        .expect("both surfaces packaged");
    let (address, server) = spawn_gateway(Some(config)).await;

    let desktop = issue_request(address, "/", &[("User-Agent", DESKTOP_UA)]).await;
    assert_eq!(desktop.status, 200);
    assert!(
        desktop.body.contains(r#"data-surface="pc""#),
        "desktop must be served the PC shell, got: {}",
        desktop.body
    );

    let mobile = issue_request(address, "/", &[("User-Agent", MOBILE_UA)]).await;
    assert_eq!(mobile.status, 200);
    assert!(
        mobile.body.contains(r#"data-surface="h5""#),
        "mobile must be served the H5 shell, got: {}",
        mobile.body
    );

    server.abort();
    let _ = std::fs::remove_dir_all(pc_root);
    let _ = std::fs::remove_dir_all(h5_root);
}

#[tokio::test]
async fn device_class_selection_is_shared_with_the_nginx_plane() {
    let pc_root = fixture_root("class-pc");
    let h5_root = fixture_root("class-h5");
    write_surface(&pc_root, "pc");
    write_surface(&h5_root, "h5");
    let config = PortalStaticConfig::try_new_adaptive(Some(pc_root.clone()), Some(h5_root.clone()))
        .expect("adaptive config");
    let (address, server) = spawn_gateway(Some(config)).await;

    // Detection order from SDKWORK_DEPLOY_SPEC.md section 8:
    // Client Hint -> iPad carve-out -> mobile User-Agent regex -> desktop.
    let hinted = issue_request(
        address,
        "/",
        &[("User-Agent", DESKTOP_UA), ("Sec-CH-UA-Mobile", "?1")],
    )
    .await;
    assert!(
        hinted.body.contains(r#"data-surface="h5""#),
        "Sec-CH-UA-Mobile: ?1 must force the H5 surface"
    );

    // iPad before the mobile regex: this User-Agent also contains "Mobile", and
    // `tabletArchitecture` is pc-web, so it must not be served H5.
    let ipad = issue_request(address, "/", &[("User-Agent", IPAD_UA)]).await;
    assert!(
        ipad.body.contains(r#"data-surface="pc""#),
        "iPad must resolve to the PC surface before the mobile regex runs, got: {}",
        ipad.body
    );

    // A shared cache must key on both device-class inputs. The value is pinned
    // byte-for-byte to the product-edge reference implementation
    // (`sdkwork-webserver` `adaptive_surface.rs::adaptive_vary_header`), so the
    // nginx plane, the dev rewriter and this gateway describe one cache key.
    //
    // `Sec-CH-UA-Mobile` is a low-entropy Client Hint that Chromium sends by
    // default, so no `Accept-CH` solicitation is emitted — the workspace has no
    // such header anywhere, and APP_RUNTIME_TOPOLOGY_SPEC.md only asks for
    // `Vary: user-agent` on the dev plane.
    for response in [&hinted, &ipad] {
        assert_eq!(
            response.header("vary"),
            Some("User-Agent, Sec-CH-UA-Mobile"),
            "adaptive responses must carry the shared cache key"
        );
    }

    // A deeper SPA route must still resolve the same surface (spaFallback).
    let deep = issue_request(address, "/console/usage", &[("User-Agent", MOBILE_UA)]).await;
    assert_eq!(deep.status, 200);
    assert!(deep.body.contains(r#"data-surface="h5""#));

    // API traffic must never be answered by a SPA shell.
    let api = issue_request(address, "/v1/ping", &[("User-Agent", MOBILE_UA)]).await;
    assert_eq!(api.status, 200);
    assert_eq!(api.body, "pong");

    server.abort();
    let _ = std::fs::remove_dir_all(pc_root);
    let _ = std::fs::remove_dir_all(h5_root);
}

#[tokio::test]
async fn packaged_surface_collapses_when_the_preferred_one_is_absent() {
    let pc_root = fixture_root("collapse-pc");
    write_surface(&pc_root, "pc");
    let pc_only =
        PortalStaticConfig::try_new_adaptive(Some(pc_root.clone()), None).expect("pc-only config");
    let (address, server) = spawn_gateway(Some(pc_only)).await;
    let mobile = issue_request(address, "/", &[("User-Agent", MOBILE_UA)]).await;
    assert_eq!(mobile.status, 200);
    assert!(
        mobile.body.contains(r#"data-surface="pc""#),
        "mobile collapses onto PC when H5 is not packaged"
    );
    server.abort();

    let h5_root = fixture_root("collapse-h5");
    write_surface(&h5_root, "h5");
    let h5_only =
        PortalStaticConfig::try_new_adaptive(None, Some(h5_root.clone())).expect("h5-only config");
    let (address, server) = spawn_gateway(Some(h5_only)).await;
    let desktop = issue_request(address, "/", &[("User-Agent", DESKTOP_UA)]).await;
    assert_eq!(desktop.status, 200);
    assert!(
        desktop.body.contains(r#"data-surface="h5""#),
        "desktop collapses onto H5 when PC is not packaged"
    );
    server.abort();

    let _ = std::fs::remove_dir_all(pc_root);
    let _ = std::fs::remove_dir_all(h5_root);
}

#[tokio::test]
async fn api_only_process_serves_no_shell() {
    let (address, server) = spawn_gateway(None).await;
    let page = issue_request(address, "/", &[("User-Agent", DESKTOP_UA)]).await;
    assert_eq!(
        page.status, 404,
        "with neither surface packaged the process must not invent a shell"
    );
    let api = issue_request(address, "/v1/ping", &[]).await;
    assert_eq!(api.status, 200);
    assert_eq!(api.body, "pong");
    server.abort();
}
