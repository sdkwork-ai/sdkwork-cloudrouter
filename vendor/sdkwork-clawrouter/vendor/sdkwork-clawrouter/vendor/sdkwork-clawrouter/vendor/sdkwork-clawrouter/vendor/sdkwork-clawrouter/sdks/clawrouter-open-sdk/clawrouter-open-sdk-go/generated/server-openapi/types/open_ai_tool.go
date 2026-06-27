package types

// OpenAI-compatible open ai tool schema exposed by Claw Router.
type OpenAiTool struct {
	Function OpenAiFunctionDefinition `json:"function"`
	Type string `json:"type"`
}
