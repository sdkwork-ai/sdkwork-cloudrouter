package types

// One generated image record returned by Ark.
type ArkImageGenerationData struct {
	B64Json string `json:"b64_json"`
	BoundingBox map[string]ProviderJsonValue `json:"bounding_box"`
	Description string `json:"description"`
	Error ProviderTaskError `json:"error"`
	Name string `json:"name"`
	OutputFormat string `json:"output_format"`
	Size string `json:"size"`
	Url string `json:"url"`
	ZIndex int `json:"z_index"`
}
