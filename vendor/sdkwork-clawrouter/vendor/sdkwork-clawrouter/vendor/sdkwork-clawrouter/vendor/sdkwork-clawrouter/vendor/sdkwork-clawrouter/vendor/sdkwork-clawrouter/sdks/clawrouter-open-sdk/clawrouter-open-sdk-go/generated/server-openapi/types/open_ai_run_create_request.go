package types

// OpenAI-compatible request to create a thread run.
type OpenAiRunCreateRequest struct {
	AdditionalInstructions string `json:"additional_instructions"`
	AssistantId string `json:"assistant_id"`
	Instructions string `json:"instructions"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	Stream bool `json:"stream"`
	Tools []ProviderJsonValue `json:"tools"`
}
