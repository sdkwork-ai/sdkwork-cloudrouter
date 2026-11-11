package types

// DeepSeek-compatible web search request.
type OpenAiDeepSeekWebSearchRequest struct {
	Count int `json:"count"`
	Localization string `json:"localization"`
	NeedContent bool `json:"need_content"`
	OriQuestion string `json:"ori_question"`
	Query string `json:"query"`
}
