package types

// Counts of files in each vector store processing state.
type OpenAiVectorStoreFileCounts struct {
	Cancelled int `json:"cancelled"`
	Completed int `json:"completed"`
	Failed int `json:"failed"`
	InProgress int `json:"in_progress"`
	Total int `json:"total"`
}
