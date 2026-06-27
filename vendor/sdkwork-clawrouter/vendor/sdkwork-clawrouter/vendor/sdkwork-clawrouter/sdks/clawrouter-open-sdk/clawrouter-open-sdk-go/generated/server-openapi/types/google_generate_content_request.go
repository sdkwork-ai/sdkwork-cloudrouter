package types

// Google Gemini google generate content request schema exposed by Claw Router vendor routing.
type GoogleGenerateContentRequest struct {
	CachedContent string `json:"cachedContent"`
	Contents []GoogleContent `json:"contents"`
	GenerationConfig GoogleGenerationConfig `json:"generationConfig"`
	SafetySettings []GoogleSafetySetting `json:"safetySettings"`
	SystemInstruction GoogleContent `json:"systemInstruction"`
	ToolConfig GoogleToolConfig `json:"toolConfig"`
	Tools []GoogleTool `json:"tools"`
}
