package types

// Google Gemini google generation config schema exposed by Claw Router vendor routing.
type GoogleGenerationConfig struct {
	CandidateCount int `json:"candidateCount"`
	MaxOutputTokens int `json:"maxOutputTokens"`
	ResponseMimeType string `json:"responseMimeType"`
	ResponseSchema GoogleSchema `json:"responseSchema"`
	StopSequences []string `json:"stopSequences"`
	Temperature float64 `json:"temperature"`
	ThinkingConfig GoogleThinkingConfig `json:"thinkingConfig"`
	TopK int `json:"topK"`
	TopP float64 `json:"topP"`
}
