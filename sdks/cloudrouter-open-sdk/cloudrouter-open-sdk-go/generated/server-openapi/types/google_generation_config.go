package types

// Google Gemini google generation config schema exposed by Cloud Router vendor routing.
type GoogleGenerationConfig struct {
	AudioTranscriptionConfig map[string]ProviderJsonValue `json:"audioTranscriptionConfig"`
	CandidateCount int `json:"candidateCount"`
	EnableAffectiveDialog bool `json:"enableAffectiveDialog"`
	EnableEnhancedCivicAnswers bool `json:"enableEnhancedCivicAnswers"`
	FrequencyPenalty float64 `json:"frequencyPenalty"`
	ImageConfig map[string]ProviderJsonValue `json:"imageConfig"`
	Logprobs int `json:"logprobs"`
	MaxOutputTokens int `json:"maxOutputTokens"`
	MediaResolution string `json:"mediaResolution"`
	PresencePenalty float64 `json:"presencePenalty"`
	ResponseFormat map[string]ProviderJsonValue `json:"responseFormat"`
	ResponseJsonSchema ProviderJsonValue `json:"responseJsonSchema"`
	ResponseLogprobs bool `json:"responseLogprobs"`
	ResponseMimeType string `json:"responseMimeType"`
	ResponseModalities []string `json:"responseModalities"`
	ResponseSchema GoogleSchema `json:"responseSchema"`
	Seed int `json:"seed"`
	SpeechConfig map[string]ProviderJsonValue `json:"speechConfig"`
	StopSequences []string `json:"stopSequences"`
	Temperature float64 `json:"temperature"`
	ThinkingConfig GoogleThinkingConfig `json:"thinkingConfig"`
	TopK int `json:"topK"`
	TopP float64 `json:"topP"`
	TranslationConfig map[string]ProviderJsonValue `json:"translationConfig"`
}
