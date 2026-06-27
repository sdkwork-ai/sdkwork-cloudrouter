package types

// Google Gemini google cached content create request schema exposed by Claw Router vendor routing.
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
