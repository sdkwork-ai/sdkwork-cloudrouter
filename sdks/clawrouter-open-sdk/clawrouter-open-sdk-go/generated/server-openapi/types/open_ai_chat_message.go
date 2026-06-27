package types

// OpenAI-compatible open ai chat message schema exposed by Claw Router.
type OpenAiChatMessage struct {
	Content string `json:"content"`
	FunctionCall OpenAiFunctionCall `json:"function_call"`
	Name string `json:"name"`
	Refusal string `json:"refusal"`
	Role string `json:"role"`
	ToolCallId string `json:"tool_call_id"`
	ToolCalls []OpenAiToolCall `json:"tool_calls"`
}
