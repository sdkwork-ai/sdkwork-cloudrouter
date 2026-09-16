package types

// Kling-compatible kling motion control request schema exposed by Cloud Router vendor routing.
type KlingMotionControlRequest struct {
	CallbackUrl string `json:"callback_url"`
	Image string `json:"image"`
	ModelName string `json:"model_name"`
	Prompt string `json:"prompt"`
	Video string `json:"video"`
}
