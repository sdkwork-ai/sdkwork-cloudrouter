package types

// OpenAI-compatible image generation response.
type OpenAiImageList struct {
	Created int `json:"created"`
	Data []OpenAiImage `json:"data"`
	Usage OpenAiTokenUsage `json:"usage"`
}
