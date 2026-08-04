package types

// OpenAI-compatible vector store search response.
type OpenAiVectorStoreSearchResponse struct {
	Data []OpenAiVectorStoreSearchResult `json:"data"`
	Object string `json:"object"`
	SearchQuery []string `json:"search_query"`
}
