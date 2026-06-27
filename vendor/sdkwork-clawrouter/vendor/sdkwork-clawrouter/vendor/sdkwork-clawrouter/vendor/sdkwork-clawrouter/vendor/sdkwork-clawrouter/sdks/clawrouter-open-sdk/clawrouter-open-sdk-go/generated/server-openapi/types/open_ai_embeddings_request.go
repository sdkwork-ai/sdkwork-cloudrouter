package types

// OpenAI-compatible open ai embeddings request schema exposed by Claw Router.
type OpenAiEmbeddingsRequest struct {
	Dimensions int `json:"dimensions"`
	EncodingFormat string `json:"encoding_format"`
	Input string `json:"input"`
	Model string `json:"model"`
	User string `json:"user"`
}
