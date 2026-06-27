package types

// Google Gemini google batch embed contents request schema exposed by Claw Router vendor routing.
type GoogleBatchEmbedContentsRequest struct {
	Requests []GoogleEmbedContentRequest `json:"requests"`
}
