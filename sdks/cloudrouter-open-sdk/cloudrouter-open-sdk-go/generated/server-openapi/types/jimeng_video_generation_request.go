package types

// Jimeng video generation request.
type JimengVideoGenerationRequest struct {
	CallbackUrl string `json:"callback_url"`
	Duration int `json:"duration"`
	Fps int `json:"fps"`
	Image string `json:"image"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Ratio string `json:"ratio"`
	Seed int `json:"seed"`
}
