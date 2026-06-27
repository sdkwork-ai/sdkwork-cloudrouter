package types

// OpenAI-compatible eval run output item.
type OpenAiEvalRunOutputItem struct {
	CreatedAt int `json:"created_at"`
	EvalId string `json:"eval_id"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Object string `json:"object"`
	Results []ProviderJsonValue `json:"results"`
	RunId string `json:"run_id"`
	Sample ProviderJsonValue `json:"sample"`
	Status string `json:"status"`
}
