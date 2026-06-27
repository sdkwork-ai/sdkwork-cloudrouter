package types

// OpenAI-compatible open ai conversation content part schema exposed by Claw Router.
type OpenAiConversationContentPart struct {
	FileId string `json:"file_id"`
	ImageUrl string `json:"image_url"`
	Text string `json:"text"`
	Type string `json:"type"`
}
