package types

// Single vector store search result.
type OpenAiVectorStoreSearchResult struct {
	Attributes map[string]ProviderJsonValue `json:"attributes"`
	Content []ProviderJsonValue `json:"content"`
	FileId string `json:"file_id"`
	Filename string `json:"filename"`
	Score float64 `json:"score"`
}
