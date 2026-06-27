package types

// OpenAI-compatible open ai chat completion schema exposed by Claw Router.
type OpenAiChatCompletion struct {
	Choices []OpenAiChatCompletionChoice `json:"choices"`
	Created int `json:"created"`
	Id string `json:"id"`
	Model string `json:"model"`
	Object string `json:"object"`
	RequestId string `json:"request_id"`
	ServiceTier string `json:"service_tier"`
	SystemFingerprint string `json:"system_fingerprint"`
	Usage OpenAiTokenUsage `json:"usage"`
}
