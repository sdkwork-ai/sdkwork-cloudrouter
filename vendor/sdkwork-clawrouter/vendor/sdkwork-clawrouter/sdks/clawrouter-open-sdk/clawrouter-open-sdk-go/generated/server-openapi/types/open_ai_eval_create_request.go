package types

// OpenAI-compatible request to create an eval.
type OpenAiEvalCreateRequest struct {
	DataSource ProviderJsonValue `json:"data_source"`
	DataSourceConfig ProviderJsonValue `json:"data_source_config"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	TestingCriteria []ProviderJsonValue `json:"testing_criteria"`
}
