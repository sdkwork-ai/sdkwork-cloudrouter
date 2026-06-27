package types

// Google Gemini google tool schema exposed by Claw Router vendor routing.
type GoogleTool struct {
	CodeExecution GoogleCodeExecutionTool `json:"codeExecution"`
	FunctionDeclarations []GoogleFunctionDeclaration `json:"functionDeclarations"`
	GoogleSearch GoogleSearchTool `json:"googleSearch"`
	UrlContext GoogleUrlContextTool `json:"urlContext"`
}
