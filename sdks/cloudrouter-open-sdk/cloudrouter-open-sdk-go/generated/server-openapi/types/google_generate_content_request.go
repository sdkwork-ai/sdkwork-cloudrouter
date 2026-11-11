package types

// Google Gemini google generate content request schema exposed by Cloud Router vendor routing.
type GoogleGenerateContentRequest struct {
	CachedContent string `json:"cachedContent"`
	Contents []GoogleContent `json:"contents"`
	ContinuationToken string `json:"continuationToken"`
	GenerationConfig GoogleGenerationConfig `json:"generationConfig"`
	Labels map[string]string `json:"labels"`
	Model string `json:"model"`
	SafetySettings []GoogleSafetySetting `json:"safetySettings"`
	ServiceTier string `json:"serviceTier"`
	Store bool `json:"store"`
	SystemInstruction GoogleContent `json:"systemInstruction"`
	ToolConfig GoogleToolConfig `json:"toolConfig"`
	Tools []GoogleTool `json:"tools"`
}
