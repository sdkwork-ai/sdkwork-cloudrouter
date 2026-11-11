package types

// xAI deferred-image poll result: HTTP 202 while pending, 200 with data when done, or a body error when failed.
type XaiDeferredImageResponse struct {
	Data []XaiGeneratedImage `json:"data"`
	Error map[string]ProviderJsonValue `json:"error"`
	RequestId string `json:"request_id"`
	Status string `json:"status"`
	Usage XaiUsage `json:"usage"`
}
