package types

// ByteDance Ark Seedream image generation request; the vendor serves the official `/api/v3/images/generations` contract.
type BytedanceImageGenerationRequest struct {
	Background string `json:"background"`
	Image string `json:"image"`
	LayerDecomposition bool `json:"layer_decomposition"`
	Model string `json:"model"`
	OptimizePromptOptions map[string]ProviderJsonValue `json:"optimize_prompt_options"`
	OutputFormat string `json:"output_format"`
	Prompt string `json:"prompt"`
	ResponseFormat string `json:"response_format"`
	SequentialImageGeneration string `json:"sequential_image_generation"`
	SequentialImageGenerationOptions map[string]ProviderJsonValue `json:"sequential_image_generation_options"`
	Size string `json:"size"`
	Stream bool `json:"stream"`
	Tools []ArkWebSearchTool `json:"tools"`
	Watermark bool `json:"watermark"`
}
