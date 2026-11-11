package types

// DeepSeek-compatible web search response.
type OpenAiDeepSeekWebSearchResponse struct {
	Results []OpenAiDeepSeekWebSearchResult `json:"results"`
}
