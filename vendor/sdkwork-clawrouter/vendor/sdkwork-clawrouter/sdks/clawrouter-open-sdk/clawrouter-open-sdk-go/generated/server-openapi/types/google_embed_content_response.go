package types

// Google Gemini google embed content response schema exposed by Claw Router vendor routing.
type GoogleEmbedContentResponse struct {
	Embedding GoogleContentEmbedding `json:"embedding"`
}
