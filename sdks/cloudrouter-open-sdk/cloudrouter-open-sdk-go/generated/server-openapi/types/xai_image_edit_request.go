package types

// xAI Grok Imagine image edit request (EditImageRequest).
type XaiImageEditRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	Deferred bool `json:"deferred"`
	Image XaiImageUrl `json:"image"`
	Images []XaiImageUrl `json:"images"`
	Model string `json:"model"`
	N int `json:"n"`
	Output map[string]ProviderJsonValue `json:"output"`
	Prompt string `json:"prompt"`
	Resolution string `json:"resolution"`
	ResponseFormat string `json:"response_format"`
	StorageOptions map[string]ProviderJsonValue `json:"storage_options"`
	User string `json:"user"`
}
