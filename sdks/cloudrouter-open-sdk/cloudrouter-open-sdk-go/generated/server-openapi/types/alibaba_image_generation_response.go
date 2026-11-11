package types

// Alibaba DashScope Wanx image task submission acknowledgement.
type AlibabaImageGenerationResponse struct {
	Code string `json:"code"`
	Message string `json:"message"`
	Output AlibabaAsyncTask `json:"output"`
	RequestId string `json:"request_id"`
	Usage AlibabaTaskUsage `json:"usage"`
}
