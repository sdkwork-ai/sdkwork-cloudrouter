package types

// OpenAI-compatible open ai response input content part schema exposed by Claw Router.
type OpenAiResponseInputContentPart struct {
	Detail string `json:"detail"`
	FileData string `json:"file_data"`
	FileId string `json:"file_id"`
	Filename string `json:"filename"`
	ImageUrl string `json:"image_url"`
	Text string `json:"text"`
	Type string `json:"type"`
}
