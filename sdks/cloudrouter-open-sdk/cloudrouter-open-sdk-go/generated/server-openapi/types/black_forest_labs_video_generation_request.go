package types

// Black Forest Labs FLUX 3 video generation request (`POST /v1/flux-3-video`). The vendor body is a discriminated union on `mode`: `t2v` requires `prompt`, `i2v` requires `prompt` and `keyframes`, `v2v` requires `prompt` and `start_video`, and `draft_enhance` requires `draft_cache`.
type BlackForestLabsVideoGenerationRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	Draft bool `json:"draft"`
	DraftCache string `json:"draft_cache"`
	Duration int `json:"duration"`
	GenerateAudio bool `json:"generate_audio"`
	Keyframes string `json:"keyframes"`
	Mode string `json:"mode"`
	Prompt string `json:"prompt"`
	Resolution string `json:"resolution"`
	SafetyTolerance int `json:"safety_tolerance"`
	StartVideo string `json:"start_video"`
	User string `json:"user"`
	Version string `json:"version"`
}
