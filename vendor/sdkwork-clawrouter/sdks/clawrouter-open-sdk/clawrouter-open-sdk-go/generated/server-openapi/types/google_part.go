package types

// Google Gemini google part schema exposed by Claw Router vendor routing.
type GooglePart struct {
	CodeExecutionResult GoogleCodeExecutionResult `json:"codeExecutionResult"`
	ExecutableCode GoogleExecutableCode `json:"executableCode"`
	FileData GoogleFileData `json:"fileData"`
	FunctionCall GoogleFunctionCall `json:"functionCall"`
	FunctionResponse GoogleFunctionResponse `json:"functionResponse"`
	InlineData GoogleBlob `json:"inlineData"`
	Text string `json:"text"`
}
