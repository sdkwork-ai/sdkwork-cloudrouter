package types

// Google Gemini google safety rating schema exposed by Claw Router vendor routing.
type GoogleSafetyRating struct {
	Blocked bool `json:"blocked"`
	Category string `json:"category"`
	Probability string `json:"probability"`
}
