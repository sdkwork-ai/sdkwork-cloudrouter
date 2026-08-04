package types

// Google Gemini google batch embed contents response schema exposed by Cloud Router vendor routing.
type GoogleBatchEmbedContentsResponse struct {
	Embeddings []GoogleContentEmbedding `json:"embeddings"`
}
