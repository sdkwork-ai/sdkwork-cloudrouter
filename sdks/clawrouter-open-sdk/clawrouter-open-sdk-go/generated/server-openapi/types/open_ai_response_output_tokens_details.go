package types

// OpenAI-compatible open ai response output tokens details schema exposed by Claw Router.
type OpenAiResponseOutputTokensDetails struct {
	ReasoningTokens int `json:"reasoning_tokens"`
}
