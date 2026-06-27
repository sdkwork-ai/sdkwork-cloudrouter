use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum McpTransportKind {
    Stdio,
    Sse,
    Http,
    StreamableHttp,
}

impl McpTransportKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Stdio => "stdio",
            Self::Sse => "sse",
            Self::Http => "http",
            Self::StreamableHttp => "streamable-http",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "stdio" => Some(Self::Stdio),
            "sse" => Some(Self::Sse),
            "http" => Some(Self::Http),
            "streamable-http" => Some(Self::StreamableHttp),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum McpAuthKind {
    None,
    Bearer,
    ApiKey,
    OAuth,
}

impl McpAuthKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Bearer => "bearer",
            Self::ApiKey => "api-key",
            Self::OAuth => "oauth",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "none" => Some(Self::None),
            "bearer" => Some(Self::Bearer),
            "api-key" => Some(Self::ApiKey),
            "oauth" => Some(Self::OAuth),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum McpLifecycleStatus {
    Draft,
    Active,
    Disabled,
    Archived,
    Deleted,
}

impl McpLifecycleStatus {
    pub fn as_db_code(self) -> i16 {
        match self {
            Self::Draft => 0,
            Self::Active => 1,
            Self::Disabled => 2,
            Self::Archived => 3,
            Self::Deleted => 4,
        }
    }

    pub fn from_db_code(value: i16) -> Option<Self> {
        match value {
            0 => Some(Self::Draft),
            1 => Some(Self::Active),
            2 => Some(Self::Disabled),
            3 => Some(Self::Archived),
            4 => Some(Self::Deleted),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum McpPublishStatus {
    Draft,
    Published,
    Deprecated,
}

impl McpPublishStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Published => "published",
            Self::Deprecated => "deprecated",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "draft" => Some(Self::Draft),
            "published" => Some(Self::Published),
            "deprecated" => Some(Self::Deprecated),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum McpVisibility {
    Private,
    Tenant,
    Organization,
    Public,
}

impl McpVisibility {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Private => "private",
            Self::Tenant => "tenant",
            Self::Organization => "organization",
            Self::Public => "public",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "private" => Some(Self::Private),
            "tenant" => Some(Self::Tenant),
            "organization" => Some(Self::Organization),
            "public" => Some(Self::Public),
            _ => None,
        }
    }

    pub fn default_data_scope(self) -> McpDataScope {
        match self {
            Self::Private => McpDataScope::Private,
            Self::Tenant => McpDataScope::Tenant,
            Self::Organization => McpDataScope::Organization,
            Self::Public => McpDataScope::Public,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum McpDataScope {
    Default,
    Private,
    Organization,
    Tenant,
    Public,
}

impl McpDataScope {
    pub fn as_db_code(self) -> i16 {
        match self {
            Self::Default => 0,
            Self::Private => 1,
            Self::Organization => 2,
            Self::Tenant => 3,
            Self::Public => 4,
        }
    }

    pub fn from_db_code(value: i16) -> Option<Self> {
        match value {
            0 => Some(Self::Default),
            1 => Some(Self::Private),
            2 => Some(Self::Organization),
            3 => Some(Self::Tenant),
            4 => Some(Self::Public),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum McpHealthStatus {
    Unknown,
    Healthy,
    Degraded,
    Unhealthy,
}

impl McpHealthStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Unknown => "unknown",
            Self::Healthy => "healthy",
            Self::Degraded => "degraded",
            Self::Unhealthy => "unhealthy",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "unknown" => Some(Self::Unknown),
            "healthy" => Some(Self::Healthy),
            "degraded" => Some(Self::Degraded),
            "unhealthy" => Some(Self::Unhealthy),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum McpInvocationKind {
    Tool,
    Resource,
    Prompt,
}

impl McpInvocationKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Tool => "tool",
            Self::Resource => "resource",
            Self::Prompt => "prompt",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "tool" => Some(Self::Tool),
            "resource" => Some(Self::Resource),
            "prompt" => Some(Self::Prompt),
            _ => None,
        }
    }
}
