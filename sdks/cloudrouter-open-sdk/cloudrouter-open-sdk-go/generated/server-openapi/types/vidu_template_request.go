package types

// Vidu vidu template request schema exposed by Cloud Router vendor routing.
type ViduTemplateRequest struct {
	CallbackUrl string `json:"callback_url"`
	Images []string `json:"images"`
	Payload string `json:"payload"`
	Template string `json:"template"`
	VideoUrls []string `json:"video_urls"`
}
