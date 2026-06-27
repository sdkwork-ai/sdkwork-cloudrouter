package types

// OpenAI-compatible request to complete an upload.
type OpenAiUploadCompleteRequest struct {
	Md5 string `json:"md5"`
	PartIds []string `json:"part_ids"`
}
