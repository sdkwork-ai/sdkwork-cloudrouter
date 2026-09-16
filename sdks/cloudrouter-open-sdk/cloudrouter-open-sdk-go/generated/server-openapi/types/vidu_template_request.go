package types

// Vidu template video request schema (motion sync templates such as motion_control_2) exposed by Cloud Router vendor routing.
type ViduTemplateRequest struct {
	Template string `json:"template"`
	Images []string `json:"images"`
	VideoUrls []string `json:"video_urls"`
	Payload string `json:"payload"`
	CallbackUrl string `json:"callback_url"`
}
