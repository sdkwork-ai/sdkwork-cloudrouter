package types

// Anthropic Claude anthropic message schema exposed by Claw Router vendor routing.
type AnthropicMessage struct {
	Content []AnthropicContentBlock `json:"content"`
	Id string `json:"id"`
	Model string `json:"model"`
	Role string `json:"role"`
	StopReason string `json:"stop_reason"`
	StopSequence string `json:"stop_sequence"`
	Type string `json:"type"`
	Usage AnthropicUsage `json:"usage"`
}
