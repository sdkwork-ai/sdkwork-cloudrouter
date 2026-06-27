package types

// Google Gemini google file list response schema exposed by Claw Router vendor routing.
type GoogleFileListResponse struct {
	Files []GoogleFile `json:"files"`
	NextPageToken string `json:"nextPageToken"`
}
