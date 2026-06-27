package types

// OpenAI-compatible eval run object.
type OpenAiEvalRun struct {
	CreatedAt int `json:"created_at"`
	DataSource ProviderJsonValue `json:"data_source"`
	EvalId string `json:"eval_id"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	ReportUrl string `json:"report_url"`
	ResultCounts OpenAiEvalRunResultCounts `json:"result_counts"`
	Status string `json:"status"`
}
