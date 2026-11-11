package types

// OpenAI-compatible image edit request (multipart form).
type OpenAiImageEditMultipartRequest struct {
	Background string `json:"background"`
	Complexity string `json:"complexity"`
	FrameCount int `json:"frame_count"`
	FrameDurationMs int `json:"frame_duration_ms"`
	Image OpenAiBinaryFilePart `json:"image"`
	InputFidelity string `json:"input_fidelity"`
	Markup string `json:"markup"`
	Mask OpenAiBinaryFilePart `json:"mask"`
	Model string `json:"model"`
	Moderation string `json:"moderation"`
	N int `json:"n"`
	OutputCompression int `json:"output_compression"`
	OutputFormat string `json:"output_format"`
	PartialImages int `json:"partial_images"`
	Prompt string `json:"prompt"`
	Quality string `json:"quality"`
	ResponseFormat string `json:"response_format"`
	SafetyIdentifier string `json:"safety_identifier"`
	Size string `json:"size"`
	Stream bool `json:"stream"`
	Svg map[string]ProviderJsonValue `json:"svg"`
	User string `json:"user"`
}
