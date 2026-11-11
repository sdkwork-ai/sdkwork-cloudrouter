package types

// xAI Grok Imagine video generation request (GenerateVideoRequest). prompt is required for text-to-video and reference-to-video and optional when image supplies the first frame.
type XaiVideoGenerationRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	Duration int `json:"duration"`
	Image XaiImageUrl `json:"image"`
	Keyframes []XaiImageUrl `json:"keyframes"`
	Model string `json:"model"`
	Output map[string]ProviderJsonValue `json:"output"`
	Prompt string `json:"prompt"`
	ReferenceAudios []string `json:"reference_audios"`
	ReferenceImages []XaiImageUrl `json:"reference_images"`
	Resolution string `json:"resolution"`
	StorageOptions map[string]ProviderJsonValue `json:"storage_options"`
	User string `json:"user"`
}
