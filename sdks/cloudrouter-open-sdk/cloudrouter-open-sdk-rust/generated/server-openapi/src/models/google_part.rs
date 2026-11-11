use serde::{Deserialize, Serialize};

use crate::models::{GoogleBlob, GoogleCodeExecutionResult, GoogleExecutableCode, GoogleFileData, GoogleFunctionCall, GoogleFunctionResponse};

/// Google Gemini google part schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GooglePart {
    /// Audio input or output transcription.
    #[serde(rename = "audioTranscription")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_transcription: Option<std::collections::HashMap<String, String>>,

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

    /// How the model processes this part's media.
    #[serde(rename = "mediaProcessing")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub media_processing: Option<String>,

    /// Media resolution for the input media.
    #[serde(rename = "mediaResolution")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub media_resolution: Option<std::collections::HashMap<String, String>>,

    /// Custom metadata associated with the part.
    #[serde(rename = "partMetadata")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub part_metadata: Option<std::collections::HashMap<String, String>>,

    /// Metadata applied to text parts to customize speech output.
    #[serde(rename = "speechMetadata")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub speech_metadata: Option<std::collections::HashMap<String, String>>,

    /// Text content part.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Whether the part is a thought from the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thought: Option<bool>,

    /// Opaque signature for the thought so it can be reused in subsequent requests.
    #[serde(rename = "thoughtSignature")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thought_signature: Option<String>,

    /// Server-side tool call.
    #[serde(rename = "toolCall")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_call: Option<std::collections::HashMap<String, String>>,

    /// Output from a server-side tool execution.
    #[serde(rename = "toolResponse")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_response: Option<std::collections::HashMap<String, String>>,

    /// Video metadata for video inputs.
    #[serde(rename = "videoMetadata")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_metadata: Option<std::collections::HashMap<String, String>>,
}
