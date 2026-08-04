package types

// OpenAI-compatible open ai embedding list schema exposed by Cloud Router.
type OpenAiEmbeddingList struct {
	Data []OpenAiEmbedding `json:"data"`
	Model string `json:"model"`
	Object string `json:"object"`
	Usage OpenAiEmbeddingUsage `json:"usage"`
}
