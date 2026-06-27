package types

// OpenAI-compatible open ai annotation schema exposed by Claw Router.
type OpenAiAnnotation struct {
	EndIndex int `json:"end_index"`
	FileId string `json:"file_id"`
	Filename string `json:"filename"`
	Index int `json:"index"`
	StartIndex int `json:"start_index"`
	Title string `json:"title"`
	Type string `json:"type"`
	Url string `json:"url"`
}
