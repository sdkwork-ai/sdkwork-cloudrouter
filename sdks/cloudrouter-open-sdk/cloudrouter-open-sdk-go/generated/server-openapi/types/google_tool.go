package types

// Google Gemini google tool schema exposed by Cloud Router vendor routing.
type GoogleTool struct {
	CodeExecution GoogleCodeExecutionTool `json:"codeExecution"`
	ComputerUse map[string]ProviderJsonValue `json:"computerUse"`
	FileSearch map[string]ProviderJsonValue `json:"fileSearch"`
	FunctionDeclarations []GoogleFunctionDeclaration `json:"functionDeclarations"`
	GoogleMaps map[string]ProviderJsonValue `json:"googleMaps"`
	GoogleSearch GoogleSearchTool `json:"googleSearch"`
	GoogleSearchRetrieval map[string]ProviderJsonValue `json:"googleSearchRetrieval"`
	McpServers []map[string]ProviderJsonValue `json:"mcpServers"`
	UrlContext GoogleUrlContextTool `json:"urlContext"`
}
