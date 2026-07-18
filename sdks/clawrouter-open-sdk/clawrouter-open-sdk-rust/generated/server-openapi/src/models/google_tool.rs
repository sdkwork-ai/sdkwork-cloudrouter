use serde::{Deserialize, Serialize};

use crate::models::{GoogleCodeExecutionTool, GoogleFunctionDeclaration, GoogleSearchTool, GoogleUrlContextTool};

/// Google Gemini google tool schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleTool {
    /// Code execution field on the google tool, using the google code execution tool module.
    #[serde(rename = "codeExecution")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code_execution: Option<GoogleCodeExecutionTool>,

    /// Callable function declarations.
    #[serde(rename = "functionDeclarations")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub function_declarations: Option<Vec<GoogleFunctionDeclaration>>,

    /// Google search field on the google tool, using the google search tool module.
    #[serde(rename = "googleSearch")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub google_search: Option<GoogleSearchTool>,

    /// Url context field on the google tool, using the google url context tool module.
    #[serde(rename = "urlContext")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url_context: Option<GoogleUrlContextTool>,
}
