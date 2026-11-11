package types

// PixVerse task payload shared by creation and polling.
type PixverseTaskResp struct {
	AspectRatio string `json:"aspect_ratio"`
	CreateTime string `json:"create_time"`
	Credits int `json:"credits"`
	CustomerPaths map[string]ProviderJsonValue `json:"customer_paths"`
	Duration int `json:"duration"`
	HasAudio bool `json:"has_audio"`
	Id int `json:"id"`
	ModifyTime string `json:"modify_time"`
	NegativePrompt string `json:"negative_prompt"`
	OutputHeight int `json:"outputHeight"`
	OutputWidth int `json:"outputWidth"`
	Path string `json:"path"`
	Prompt string `json:"prompt"`
	Quality string `json:"quality"`
	ResolutionRatio int `json:"resolution_ratio"`
	Seed int `json:"seed"`
	Size int `json:"size"`
	Status int `json:"status"`
	Style string `json:"style"`
	Url string `json:"url"`
	VideoId int `json:"video_id"`
}
