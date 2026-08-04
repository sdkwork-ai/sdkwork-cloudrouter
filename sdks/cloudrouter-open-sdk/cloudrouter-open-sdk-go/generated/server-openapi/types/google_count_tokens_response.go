package types

// Google Gemini google count tokens response schema exposed by Cloud Router vendor routing.
type GoogleCountTokensResponse struct {
	CachedContentTokenCount int `json:"cachedContentTokenCount"`
	TotalTokens int `json:"totalTokens"`
}
