package types

// Black Forest Labs FLUX image generation request (union of the vendor's per-model `/v1/flux-*` request variants).
type BlackForestLabsImageGenerationRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	AutoCrop bool `json:"auto_crop"`
	Bottom int `json:"bottom"`
	DilatePixels int `json:"dilate_pixels"`
	DisablePup bool `json:"disable_pup"`
	FinetuneId string `json:"finetune_id"`
	FinetuneStrength float64 `json:"finetune_strength"`
	Garment string `json:"garment"`
	Grounding bool `json:"grounding"`
	Guidance float64 `json:"guidance"`
	Height int `json:"height"`
	Image string `json:"image"`
	ImagePrompt string `json:"image_prompt"`
	ImagePromptStrength float64 `json:"image_prompt_strength"`
	Images string `json:"images"`
	InputImage string `json:"input_image"`
	InputImage2 string `json:"input_image_2"`
	InputImage3 string `json:"input_image_3"`
	InputImage4 string `json:"input_image_4"`
	InputImage5 string `json:"input_image_5"`
	InputImage6 string `json:"input_image_6"`
	InputImage7 string `json:"input_image_7"`
	InputImage8 string `json:"input_image_8"`
	InputImageBlobPath string `json:"input_image_blob_path"`
	Left int `json:"left"`
	Mask string `json:"mask"`
	Mode string `json:"mode"`
	OutputFormat string `json:"output_format"`
	Person string `json:"person"`
	Prompt string `json:"prompt"`
	PromptUpsampling bool `json:"prompt_upsampling"`
	Raw bool `json:"raw"`
	ReferenceOffsetX int `json:"reference_offset_x"`
	ReferenceOffsetY int `json:"reference_offset_y"`
	Resolution string `json:"resolution"`
	Right int `json:"right"`
	SafetyTolerance int `json:"safety_tolerance"`
	Seed int `json:"seed"`
	Steps int `json:"steps"`
	Top int `json:"top"`
	User string `json:"user"`
	Version string `json:"version"`
	WebhookSecret string `json:"webhook_secret"`
	WebhookUrl string `json:"webhook_url"`
	Width int `json:"width"`
}
