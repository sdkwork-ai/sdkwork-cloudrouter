package types

// DeepSeek-compatible request to fetch a single web page as Markdown.
type OpenAiDeepSeekWebFetchRequest struct {
	Url string `json:"url"`
}
