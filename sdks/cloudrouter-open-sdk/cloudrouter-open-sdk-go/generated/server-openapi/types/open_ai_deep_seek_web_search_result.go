package types

// One ranked DeepSeek web search result.
type OpenAiDeepSeekWebSearchResult struct {
	Authority int `json:"authority"`
	Content string `json:"content"`
	Date string `json:"date"`
	RerankScore float64 `json:"rerank_score"`
	SiteIcon string `json:"site_icon"`
	SiteName string `json:"site_name"`
	Snippet string `json:"snippet"`
	Summary string `json:"summary"`
	Title string `json:"title"`
	Url string `json:"url"`
}
