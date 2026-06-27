package types

// Google Gemini google count tokens request schema exposed by Claw Router vendor routing.
type GoogleCountTokensRequest struct {
	Contents []GoogleContent `json:"contents"`
	GenerateContentRequest GoogleGenerateContentRequest `json:"generateContentRequest"`
}
