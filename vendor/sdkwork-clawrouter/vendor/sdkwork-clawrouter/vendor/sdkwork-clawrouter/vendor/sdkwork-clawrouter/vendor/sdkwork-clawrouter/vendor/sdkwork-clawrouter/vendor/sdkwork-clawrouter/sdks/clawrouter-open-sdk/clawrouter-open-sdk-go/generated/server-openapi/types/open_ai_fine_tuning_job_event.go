package types

// OpenAI-compatible fine-tuning job event object.
type OpenAiFineTuningJobEvent struct {
	CreatedAt int `json:"created_at"`
	Data ProviderJsonValue `json:"data"`
	Id string `json:"id"`
	Level string `json:"level"`
	Message string `json:"message"`
	Object string `json:"object"`
	Type string `json:"type"`
}
