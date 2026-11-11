package types

// DeepSeek-compatible fetched page: title plus Markdown body.
type OpenAiDeepSeekWebFetchResponse struct {
	Content string `json:"content"`
	Title string `json:"title"`
}
