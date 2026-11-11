package types

// Runway text-to-image task request (union of the vendor's per-model request variants).
type RunwayTextToImageRequest struct {
	Background string `json:"background"`
	BackgroundColor string `json:"backgroundColor"`
	Colors []string `json:"colors"`
	ContentModeration map[string]ProviderJsonValue `json:"contentModeration"`
	Edit bool `json:"edit"`
	Grounding bool `json:"grounding"`
	MaskUri string `json:"maskUri"`
	Model string `json:"model"`
	OutputCount int `json:"outputCount"`
	OutputFormat string `json:"outputFormat"`
	PreciseEdit bool `json:"preciseEdit"`
	PromptText string `json:"promptText"`
	Quality string `json:"quality"`
	Ratio string `json:"ratio"`
	ReferenceImages []map[string]ProviderJsonValue `json:"referenceImages"`
	Seed int `json:"seed"`
	ThinkingLevel string `json:"thinkingLevel"`
}
