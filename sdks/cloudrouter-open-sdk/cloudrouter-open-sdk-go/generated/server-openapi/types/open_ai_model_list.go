package types

// OpenAI-compatible open ai model list schema exposed by Cloud Router.
type OpenAiModelList struct {
	Data []OpenAiModel `json:"data"`
	Object string `json:"object"`
}
