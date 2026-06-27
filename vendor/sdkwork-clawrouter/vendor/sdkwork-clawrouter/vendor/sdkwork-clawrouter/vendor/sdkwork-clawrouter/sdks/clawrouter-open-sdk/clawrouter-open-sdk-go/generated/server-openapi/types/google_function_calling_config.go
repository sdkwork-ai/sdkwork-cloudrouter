package types

// Google Gemini google function calling config schema exposed by Claw Router vendor routing.
type GoogleFunctionCallingConfig struct {
	AllowedFunctionNames []string `json:"allowedFunctionNames"`
	Mode string `json:"mode"`
}
