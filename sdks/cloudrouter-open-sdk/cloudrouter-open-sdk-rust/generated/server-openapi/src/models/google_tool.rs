use serde::{Deserialize, Serialize};

use crate::models::{GoogleCodeExecutionTool, GoogleFunctionDeclaration, GoogleSearchTool, GoogleUrlContextTool};

/// Google Gemini google tool schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleTool {
    /// Code execution field on the google tool, using the google code execution tool module.
    #[serde(rename = "codeExecution")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code_execution: Option<GoogleCodeExecutionTool>,

    /// Computer-use tool.
    #[serde(rename = "computerUse")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub computer_use: Option<std::collections::HashMap<String, String>>,

    /// File-search tool backed by a file search store.
    #[serde(rename = "fileSearch")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_search: Option<std::collections::HashMap<String, String>>,

    /// Callable function declarations.
    #[serde(rename = "functionDeclarations")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub function_declarations: Option<Vec<GoogleFunctionDeclaration>>,

    /// Grounding tool backed by Google Maps.
    #[serde(rename = "googleMaps")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub google_maps: Option<std::collections::HashMap<String, String>>,

    /// Google search field on the google tool, using the google search tool module.
    #[serde(rename = "googleSearch")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub google_search: Option<GoogleSearchTool>,

    /// Retrieval tool powered by Google search.
    #[serde(rename = "googleSearchRetrieval")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub google_search_retrieval: Option<std::collections::HashMap<String, String>>,

    /// MCP servers the model may call.
    #[serde(rename = "mcpServers")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mcp_servers: Option<Vec<std::collections::HashMap<String, String>>>,

    /// Url context field on the google tool, using the google url context tool module.
    #[serde(rename = "urlContext")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url_context: Option<GoogleUrlContextTool>,
}
