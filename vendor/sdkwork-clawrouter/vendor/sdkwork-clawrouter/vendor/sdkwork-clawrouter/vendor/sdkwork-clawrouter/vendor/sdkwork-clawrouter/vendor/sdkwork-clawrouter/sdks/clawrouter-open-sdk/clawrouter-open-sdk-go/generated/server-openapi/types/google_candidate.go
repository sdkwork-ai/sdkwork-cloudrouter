package types

// Google Gemini google candidate schema exposed by Claw Router vendor routing.
type GoogleCandidate struct {
	CitationMetadata GoogleCitationMetadata `json:"citationMetadata"`
	Content GoogleContent `json:"content"`
	FinishReason string `json:"finishReason"`
	Index int `json:"index"`
	SafetyRatings []GoogleSafetyRating `json:"safetyRatings"`
	TokenCount int `json:"tokenCount"`
}
