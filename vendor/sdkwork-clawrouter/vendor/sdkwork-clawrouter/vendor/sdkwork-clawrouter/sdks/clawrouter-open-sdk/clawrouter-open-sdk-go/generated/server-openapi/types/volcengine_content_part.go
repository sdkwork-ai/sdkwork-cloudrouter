package types

// Volcengine Ark volcengine content part schema exposed by Claw Router vendor routing.
type VolcengineContentPart struct {
	FileId string `json:"file_id"`
	ImageUrl string `json:"image_url"`
	Text string `json:"text"`
	Type string `json:"type"`
	VideoUrl string `json:"video_url"`
}
