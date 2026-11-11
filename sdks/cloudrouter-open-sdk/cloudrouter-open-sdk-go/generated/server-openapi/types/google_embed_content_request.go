package types

// Google Gemini google embed content request schema exposed by Cloud Router vendor routing.
type GoogleEmbedContentRequest struct {
	Content GoogleContent `json:"content"`
	EmbedContentConfig map[string]ProviderJsonValue `json:"embedContentConfig"`
	Model string `json:"model"`
	OutputDimensionality int `json:"outputDimensionality"`
	TaskType string `json:"taskType"`
	Title string `json:"title"`
}
