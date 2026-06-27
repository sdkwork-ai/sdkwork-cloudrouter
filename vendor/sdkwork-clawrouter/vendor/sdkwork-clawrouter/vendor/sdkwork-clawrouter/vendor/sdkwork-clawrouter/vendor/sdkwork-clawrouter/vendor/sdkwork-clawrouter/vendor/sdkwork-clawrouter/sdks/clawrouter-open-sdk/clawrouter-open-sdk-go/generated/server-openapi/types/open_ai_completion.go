package types

// OpenAI-compatible legacy text completion response.
type OpenAiCompletion struct {
	Choices []CreateCompletionChoice `json:"choices"`
	Created int `json:"created"`
	Id string `json:"id"`
	Model string `json:"model"`
	Object string `json:"object"`
	SystemFingerprint string `json:"system_fingerprint"`
	Usage OpenAiTokenUsage `json:"usage"`
}
