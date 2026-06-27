package types

// Item module returned inside the listEvalRuns list response.
type ListEvalRunsItem struct {
	Created int `json:"created"`
	CreatedAt int `json:"created_at"`
	DataSource ProviderJsonValue `json:"data_source"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	ResultCounts ProviderJsonValue `json:"result_counts"`
	Status string `json:"status"`
}
