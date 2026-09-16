package types

// Kling motion control (motion mimicry) video generation request schema exposed by Cloud Router vendor routing.
type KlingMotionControlRequest struct {
	ModelName string `json:"model_name"`
	Prompt string `json:"prompt"`
	Image string `json:"image"`
	Video string `json:"video"`
	CallbackUrl string `json:"callback_url"`
}
