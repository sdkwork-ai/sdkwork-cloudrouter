package types

// Google Gemini google usage metadata schema exposed by Claw Router vendor routing.
type GoogleUsageMetadata struct {
	CachedContentTokenCount int `json:"cachedContentTokenCount"`
	CandidatesTokenCount int `json:"candidatesTokenCount"`
	PromptTokenCount int `json:"promptTokenCount"`
	ThoughtsTokenCount int `json:"thoughtsTokenCount"`
	TotalTokenCount int `json:"totalTokenCount"`
}
