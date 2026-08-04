package types

// OpenAI-compatible request to create a batch.
type OpenAiBatchCreateRequest struct {
	CompletionWindow string `json:"completion_window"`
	Endpoint string `json:"endpoint"`
	InputFileId string `json:"input_file_id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
}
