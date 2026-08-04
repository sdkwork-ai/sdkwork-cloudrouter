package types

// Google Gemini google batch embed contents request schema exposed by Cloud Router vendor routing.
type GoogleBatchEmbedContentsRequest struct {
	Requests []GoogleEmbedContentRequest `json:"requests"`
}
