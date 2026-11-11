package types

// Google Gemini cached-content creation request (`POST /v1beta/cachedContents`).
type GoogleCachedContentCreateRequest struct {
	Contents []GoogleContent `json:"contents"`
	DisplayName string `json:"displayName"`
	ExpireTime string `json:"expireTime"`
	Model string `json:"model"`
	SystemInstruction GoogleContent `json:"systemInstruction"`
	ToolConfig GoogleToolConfig `json:"toolConfig"`
	Tools []GoogleTool `json:"tools"`
	Ttl string `json:"ttl"`
}
