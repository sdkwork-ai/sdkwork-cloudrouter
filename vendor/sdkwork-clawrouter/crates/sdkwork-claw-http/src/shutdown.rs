use std::sync::OnceLock;

use tokio::signal;
use tokio::sync::broadcast;

static SHUTDOWN_BROADCAST: OnceLock<broadcast::Sender<()>> = OnceLock::new();

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
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
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
