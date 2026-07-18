use serde::{Deserialize, Serialize};

use crate::models::{GoogleBlob, GoogleCodeExecutionResult, GoogleExecutableCode, GoogleFileData, GoogleFunctionCall, GoogleFunctionResponse};

/// Google Gemini google part schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GooglePart {
    /// Code execution result field on the google part, using the google code execution result module.
    #[serde(rename = "codeExecutionResult")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code_execution_result: Option<GoogleCodeExecutionResult>,

    /// Executable code field on the google part, using the google executable code module.
    #[serde(rename = "executableCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub executable_code: Option<GoogleExecutableCode>,

    /// File data field on the google part, using the google file data module.
    #[serde(rename = "fileData")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_data: Option<GoogleFileData>,

    /// Function call field on the google part, using the google function call module.
    #[serde(rename = "functionCall")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub function_call: Option<GoogleFunctionCall>,

    /// Function response field on the google part, using the google function response module.
    #[serde(rename = "functionResponse")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub function_response: Option<GoogleFunctionResponse>,

    /// Inline data field on the google part, using the google blob module.
    #[serde(rename = "inlineData")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub inline_data: Option<GoogleBlob>,

    /// Text content part.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}
