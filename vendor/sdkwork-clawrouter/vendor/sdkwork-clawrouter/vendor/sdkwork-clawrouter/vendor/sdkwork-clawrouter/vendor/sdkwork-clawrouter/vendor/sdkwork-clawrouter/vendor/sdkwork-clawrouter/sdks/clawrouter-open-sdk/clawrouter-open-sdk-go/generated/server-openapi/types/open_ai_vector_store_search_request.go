package types

// OpenAI-compatible request to search a vector store.
type OpenAiVectorStoreSearchRequest struct {
	Filters ProviderJsonValue `json:"filters"`
	MaxNumResults int `json:"max_num_results"`
	Query string `json:"query"`
	RankingOptions ProviderJsonValue `json:"ranking_options"`
	RewriteQuery bool `json:"rewrite_query"`
}
