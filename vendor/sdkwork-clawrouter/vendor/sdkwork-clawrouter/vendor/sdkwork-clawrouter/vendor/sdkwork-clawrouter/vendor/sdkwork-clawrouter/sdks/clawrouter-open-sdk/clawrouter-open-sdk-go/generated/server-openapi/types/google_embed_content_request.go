package types

// Google Gemini google embed content request schema exposed by Claw Router vendor routing.
type GoogleEmbedContentRequest struct {
	Content GoogleContent `json:"content"`
	OutputDimensionality int `json:"outputDimensionality"`
	TaskType string `json:"taskType"`
	Title string `json:"title"`
}
