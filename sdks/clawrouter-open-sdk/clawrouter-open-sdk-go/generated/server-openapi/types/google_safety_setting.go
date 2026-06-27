package types

// Google Gemini google safety setting schema exposed by Claw Router vendor routing.
type GoogleSafetySetting struct {
	Category string `json:"category"`
	Threshold string `json:"threshold"`
}
