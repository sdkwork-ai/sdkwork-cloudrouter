package types

// One Volcengine Ark content part. `type` selects the required member: `text` requires `text`; `image_url`, `video_url`, and `audio_url` require the matching source object; `draft_task` requires `draft_task`.
type VolcengineContentPart struct {
	AudioUrl ArkAudioSource `json:"audio_url"`
	DraftTask ArkDraftTask `json:"draft_task"`
	ImageUrl ArkImageSource `json:"image_url"`
	Role string `json:"role"`
	Text string `json:"text"`
	Type string `json:"type"`
	VideoUrl ArkVideoSource `json:"video_url"`
}
