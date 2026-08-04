package types

// OpenAI-compatible request to compact response or conversation state.
type OpenAiResponseCompactRequest struct {
	Input ProviderJsonValue `json:"input"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	PreviousResponseId string `json:"previous_response_id"`
}
