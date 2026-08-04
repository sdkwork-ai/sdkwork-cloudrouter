package types

// OpenAI-compatible request to classify text or multimodal input for moderation.
type OpenAiModerationCreateRequest struct {
	Input string `json:"input"`
	Model string `json:"model"`
}
