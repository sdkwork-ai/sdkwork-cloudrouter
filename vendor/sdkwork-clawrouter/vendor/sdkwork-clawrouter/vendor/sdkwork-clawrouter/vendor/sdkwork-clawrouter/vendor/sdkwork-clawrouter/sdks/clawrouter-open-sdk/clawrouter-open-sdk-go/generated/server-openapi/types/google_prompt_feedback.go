package types

// Google Gemini google prompt feedback schema exposed by Claw Router vendor routing.
type GooglePromptFeedback struct {
	BlockReason string `json:"blockReason"`
	SafetyRatings []GoogleSafetyRating `json:"safetyRatings"`
}
