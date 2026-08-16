use std::sync::OnceLock;

use tokio::signal;
use tokio::sync::broadcast;

static SHUTDOWN_BROADCAST: OnceLock<broadcast::Sender<()>> = OnceLock::new();

/// Default bounded grace window for in-flight requests after a shutdown
/// signal before remaining connections are aborted.
pub const DEFAULT_GRACEFUL_SHUTDOWN_DEADLINE: std::time::Duration =
    std::time::Duration::from_secs(30);

fn shutdown_broadcast_sender() -> &'static broadcast::Sender<()> {
    SHUTDOWN_BROADCAST.get_or_init(|| {
        let (sender, _) = broadcast::channel(1);
        sender
    })
}

pub fn subscribe_shutdown_signal() -> broadcast::Receiver<()> {
    shutdown_broadcast_sender().subscribe()
}

pub async fn wait_for_shutdown_signal() {
    let ctrl_c = async {
        if let Err(err) = signal::ctrl_c().await {
            tracing::error!(error = %err, "failed to install Ctrl+C handler");
            std::future::pending::<()>().await;
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match signal::unix::signal(signal::unix::SignalKind::terminate()) {
            Ok(mut stream) => {
                stream.recv().await;
            }
            Err(err) => {
                tracing::error!(error = %err, "failed to install SIGTERM handler");
                std::future::pending::<()>().await;
            }
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {
            tracing::info!("shutdown signal received: ctrl_c");
        },
        () = terminate => {
            tracing::info!("shutdown signal received: sigterm");
        },
    }

    tracing::info!("broadcasting graceful shutdown to background workers");
    let _ = shutdown_broadcast_sender().send(());
}

/// Serve with graceful shutdown and a hard deadline.
///
/// After the shutdown signal, in-flight requests get a bounded grace window;
/// when the deadline expires, the remaining connections are aborted so
/// long-lived streams (SSE and streaming relays) cannot block process exit
/// indefinitely while Kubernetes waits on `terminationGracePeriodSeconds`.
pub async fn serve_with_graceful_shutdown_deadline(
    listener: tokio::net::TcpListener,
    router: axum::Router,
    grace: std::time::Duration,
) -> std::io::Result<()> {
    let server = async {
        // Serve with connect info so downstream layers (request-log capture,
        // rate limiting) can read the real TCP peer address — plain
        // `axum::serve` never injects `ConnectInfo<SocketAddr>`.
        axum::serve(
            listener,
            router.into_make_service_with_connect_info::<std::net::SocketAddr>(),
        )
        .with_graceful_shutdown(wait_for_shutdown_signal())
        .await
    };
    tokio::pin!(server);
    tokio::select! {
        result = &mut server => result,
        _ = async {
            // The signal broadcast fires after the serve-side graceful
            // shutdown begins; then start the bounded grace window.
            let mut receiver = subscribe_shutdown_signal();
            if receiver.recv().await.is_ok() {
                tokio::time::sleep(grace).await;
            } else {
                std::future::pending::<()>().await;
            }
        } => {
            tracing::warn!(
                grace_seconds = grace.as_secs(),
                "graceful shutdown deadline reached; aborting remaining in-flight connections"
            );
            Ok(())
        }
    }
}
