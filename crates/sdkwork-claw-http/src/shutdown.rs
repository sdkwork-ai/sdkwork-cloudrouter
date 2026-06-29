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
