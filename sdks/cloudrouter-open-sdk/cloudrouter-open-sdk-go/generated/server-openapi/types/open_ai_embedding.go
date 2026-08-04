package types

// OpenAI-compatible open ai embedding schema exposed by Cloud Router.
type OpenAiEmbedding struct {
	Embedding []float64 `json:"embedding"`
	Index int `json:"index"`
	Object string `json:"object"`
}
