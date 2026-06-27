package types

// OpenAI-compatible request to create an eval run.
type OpenAiEvalRunCreateRequest struct {
	DataSource ProviderJsonValue `json:"data_source"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}
