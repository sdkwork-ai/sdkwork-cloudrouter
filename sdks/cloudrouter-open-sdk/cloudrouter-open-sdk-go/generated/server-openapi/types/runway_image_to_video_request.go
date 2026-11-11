package types

// Runway image-to-video task request (union of the vendor's per-model request variants).
type RunwayImageToVideoRequest struct {
	Audio bool `json:"audio"`
	Bitrate string `json:"bitrate"`
	CfgScale float64 `json:"cfgScale"`
	ContentModeration map[string]ProviderJsonValue `json:"contentModeration"`
	Draft bool `json:"draft"`
	Duration int `json:"duration"`
	Model string `json:"model"`
	NegativePrompt string `json:"negativePrompt"`
	OutputFormat string `json:"outputFormat"`
	PromptExpansionMode string `json:"promptExpansionMode"`
	PromptImage string `json:"promptImage"`
	PromptText string `json:"promptText"`
	ProresProfile string `json:"proresProfile"`
	ProviderSettings map[string]ProviderJsonValue `json:"providerSettings"`
	Ratio string `json:"ratio"`
	ReferenceAudio []map[string]ProviderJsonValue `json:"referenceAudio"`
	ReferenceVideos []map[string]ProviderJsonValue `json:"referenceVideos"`
	References []map[string]ProviderJsonValue `json:"references"`
	Resolution string `json:"resolution"`
	Seed int `json:"seed"`
}
