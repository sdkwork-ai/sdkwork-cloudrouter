package types

// OpenAI-compatible eval object.
type OpenAiEval struct {
	CreatedAt int `json:"created_at"`
	DataSourceConfig ProviderJsonValue `json:"data_source_config"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	TestingCriteria []ProviderJsonValue `json:"testing_criteria"`
}
