package types

// Google Gemini google content schema exposed by Claw Router vendor routing.
type GoogleContent struct {
	Parts []GooglePart `json:"parts"`
	Role string `json:"role"`
}
