use sdkwork_claw_config::{DeploymentMode, RuntimeTomlConfig, StartupInstallMode};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IamRuntimeContext {
    pub environment: String,
    pub deployment_mode: String,
    pub runtime_target: String,
}

impl IamRuntimeContext {
    pub fn from_deployment_mode(deployment_mode: DeploymentMode) -> Self {
        let deployment_mode_label = deployment_mode.as_str().to_owned();
        Self {
            environment: std::env::var(StartupInstallMode::ENV_ROUTER_ENVIRONMENT)
                .ok()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| default_environment_for_deployment(deployment_mode).to_owned()),
            deployment_mode: deployment_mode_label.clone(),
            runtime_target: default_runtime_target_for_deployment(deployment_mode).to_owned(),
        }
    }

    pub fn from_runtime_toml(
        deployment_mode: DeploymentMode,
        runtime_toml: Option<&RuntimeTomlConfig>,
    ) -> Self {
        let mut context = Self::from_deployment_mode(deployment_mode);
        if let Some(config) = runtime_toml {
            if let Some(environment) = config.install.environment.as_deref() {
                let trimmed = environment.trim();
                if !trimmed.is_empty() {
                    context.environment = trimmed.to_owned();
                }
            }
            if let Some(mode) = config.runtime.deployment_mode.as_deref() {
                let trimmed = mode.trim();
                if !trimmed.is_empty() {
                    context.deployment_mode = trimmed.to_owned();
                }
            }
        }
        context
    }
}

fn default_environment_for_deployment(deployment_mode: DeploymentMode) -> &'static str {
    match deployment_mode {
        DeploymentMode::Desktop => "dev",
        DeploymentMode::Server | DeploymentMode::Docker | DeploymentMode::Kubernetes => "prod",
    }
}

fn default_runtime_target_for_deployment(deployment_mode: DeploymentMode) -> &'static str {
    match deployment_mode {
        DeploymentMode::Desktop => "desktop",
        DeploymentMode::Server => "server",
        DeploymentMode::Docker => "container",
        DeploymentMode::Kubernetes => "container",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn runtime_context_reads_only_the_application_scoped_environment_key() {
        unsafe {
            std::env::set_var("SDKWORK_CLAW_ROUTER_ENVIRONMENT", "staging");
            std::env::set_var("SDKWORK_CLAW_ENVIRONMENT", "development");
        }

        let context = IamRuntimeContext::from_deployment_mode(DeploymentMode::Server);

        unsafe {
            std::env::remove_var("SDKWORK_CLAW_ROUTER_ENVIRONMENT");
            std::env::remove_var("SDKWORK_CLAW_ENVIRONMENT");
        }
        assert_eq!(context.environment, "staging");
    }
}
