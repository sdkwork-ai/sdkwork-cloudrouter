package types

// Google Gemini google part schema exposed by Cloud Router vendor routing.
type GooglePart struct {
	AudioTranscription map[string]ProviderJsonValue `json:"audioTranscription"`
	CodeExecutionResult GoogleCodeExecutionResult `json:"codeExecutionResult"`
	ExecutableCode GoogleExecutableCode `json:"executableCode"`
	FileData GoogleFileData `json:"fileData"`
	FunctionCall GoogleFunctionCall `json:"functionCall"`
	FunctionResponse GoogleFunctionResponse `json:"functionResponse"`
	InlineData GoogleBlob `json:"inlineData"`
	MediaProcessing string `json:"mediaProcessing"`
	MediaResolution map[string]ProviderJsonValue `json:"mediaResolution"`
	PartMetadata map[string]ProviderJsonValue `json:"partMetadata"`
	SpeechMetadata map[string]ProviderJsonValue `json:"speechMetadata"`
	Text string `json:"text"`
	Thought bool `json:"thought"`
	ThoughtSignature string `json:"thoughtSignature"`
	ToolCall map[string]ProviderJsonValue `json:"toolCall"`
	ToolResponse map[string]ProviderJsonValue `json:"toolResponse"`
	VideoMetadata map[string]ProviderJsonValue `json:"videoMetadata"`
}
