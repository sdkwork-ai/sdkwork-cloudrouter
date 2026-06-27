package types

// Google Gemini google cached content schema exposed by Claw Router vendor routing.
type GoogleCachedContent struct {
	Contents []GoogleContent `json:"contents"`
	CreateTime string `json:"createTime"`
	DisplayName string `json:"displayName"`
	ExpireTime string `json:"expireTime"`
	Model string `json:"model"`
	Name string `json:"name"`
	SystemInstruction GoogleContent `json:"systemInstruction"`
	ToolConfig GoogleToolConfig `json:"toolConfig"`
	Tools []GoogleTool `json:"tools"`
	UpdateTime string `json:"updateTime"`
	UsageMetadata GoogleCachedContentUsageMetadata `json:"usageMetadata"`
}
