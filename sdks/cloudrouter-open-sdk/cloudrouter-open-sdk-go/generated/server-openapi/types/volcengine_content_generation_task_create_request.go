package types

// Volcengine Ark video generation task creation request (`POST /api/v3/contents/generations/tasks`).
type VolcengineContentGenerationTaskCreateRequest struct {
	CallbackUrl string `json:"callback_url"`
	CameraFixed bool `json:"camera_fixed"`
	Content []VolcengineContentPart `json:"content"`
	Draft bool `json:"draft"`
	Duration int `json:"duration"`
	ExecutionExpiresAfter int `json:"execution_expires_after"`
	Frames int `json:"frames"`
	GenerateAudio bool `json:"generate_audio"`
	Model string `json:"model"`
	OmniReferenceTaskType string `json:"omni_reference_task_type"`
	OutputFormat string `json:"output_format"`
	Priority int `json:"priority"`
	Ratio string `json:"ratio"`
	Resolution string `json:"resolution"`
	ReturnLastFrame bool `json:"return_last_frame"`
	SafetyIdentifier string `json:"safety_identifier"`
	Seed int `json:"seed"`
	ServiceTier string `json:"service_tier"`
	Tools []ArkWebSearchTool `json:"tools"`
	Watermark bool `json:"watermark"`
}
