package types

// Volcengine Ark video generation task state returned by the query endpoint.
type VolcengineContentGenerationTask struct {
	Content ArkVideoTaskContent `json:"content"`
	CreatedAt int `json:"created_at"`
	Draft bool `json:"draft"`
	Duration int `json:"duration"`
	Error ProviderTaskError `json:"error"`
	ExecutionExpiresAfter int `json:"execution_expires_after"`
	Frames int `json:"frames"`
	Framespersecond int `json:"framespersecond"`
	GenerateAudio bool `json:"generate_audio"`
	Id string `json:"id"`
	Model string `json:"model"`
	OutputFormat string `json:"output_format"`
	Priority int `json:"priority"`
	Ratio string `json:"ratio"`
	Resolution string `json:"resolution"`
	SafetyIdentifier string `json:"safety_identifier"`
	Seed int `json:"seed"`
	ServiceTier string `json:"service_tier"`
	Status string `json:"status"`
	Tools []ArkWebSearchTool `json:"tools"`
	UpdatedAt int `json:"updated_at"`
	Usage ArkVideoUsage `json:"usage"`
}
