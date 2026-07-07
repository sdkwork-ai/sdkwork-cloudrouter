use sdkwork_claw_config::{DatabaseConfig, DatabaseEngine, DeploymentMode};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub deployment_mode: String,
    pub version: String,
    pub database: DatabaseHealth,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseHealth {
    pub configured: bool,
    pub engine: Option<String>,
    pub max_connections: Option<u32>,
}

impl HealthResponse {
    pub fn new(service: impl Into<String>, deployment_mode: DeploymentMode) -> Self {
        Self {
            status: "ok".to_string(),
            service: service.into(),
            deployment_mode: deployment_mode.as_str().to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            database: DatabaseHealth::unconfigured(),
        }
    }

    pub fn with_database(mut self, database: DatabaseHealth) -> Self {
        self.database = database;
        self
    }
}

impl DatabaseHealth {
    pub fn unconfigured() -> Self {
        Self {
            configured: false,
            engine: None,
            max_connections: None,
        }
    }

    pub fn from_config(config: Option<&DatabaseConfig>) -> Self {
        let Some(config) = config else {
            return Self::unconfigured();
        };

        Self {
            configured: true,
            engine: Some(database_engine_code(config.engine).to_string()),
            max_connections: Some(config.max_connections),
        }
    }
}

fn database_engine_code(engine: DatabaseEngine) -> &'static str {
    match engine {
        DatabaseEngine::Sqlite => "sqlite",
        DatabaseEngine::Postgres => "postgres",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_claw_config::{DatabaseConfig, DeploymentMode};

    #[test]
    fn health_response_exposes_service_and_deployment_mode() {
        let health =
            HealthResponse::new("sdkwork-clawrouter-cloud-gateway", DeploymentMode::Desktop);

        assert_eq!("ok", health.status);
        assert_eq!("sdkwork-clawrouter-cloud-gateway", health.service);
        assert_eq!("desktop", health.deployment_mode);
    }

    #[test]
    fn health_response_summarizes_database_config_without_leaking_url() {
        let config = DatabaseConfig::from_url_with_max_connections(
            "postgres://claw_user:secret-password@127.0.0.1/claw",
            32,
        )
        .unwrap();

        let health =
            HealthResponse::new("sdkwork-clawrouter-admin-gateway", DeploymentMode::Server)
                .with_database(DatabaseHealth::from_config(Some(&config)));
        let body = serde_json::to_string(&health).unwrap();
        let payload: serde_json::Value = serde_json::from_str(&body).unwrap();

        assert_eq!(true, payload["database"]["configured"]);
        assert_eq!("postgres", payload["database"]["engine"]);
        assert_eq!(32, payload["database"]["maxConnections"]);
        assert!(!body.contains("postgres://"));
        assert!(!body.contains("claw_user"));
        assert!(!body.contains("secret-password"));
        assert!(!body.contains("127.0.0.1"));
    }

    #[test]
    fn health_response_marks_database_unconfigured_by_default() {
        let health = HealthResponse::new(
            "sdkwork-clawrouter-standalone-gateway",
            DeploymentMode::Desktop,
        );
        let payload = serde_json::to_value(&health).unwrap();

        assert_eq!(false, payload["database"]["configured"]);
        assert!(payload["database"]["engine"].is_null());
        assert!(payload["database"]["maxConnections"].is_null());
    }
}
