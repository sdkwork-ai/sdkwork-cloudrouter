package types

// OpenAI-compatible open ai model schema exposed by Cloud Router.
type OpenAiModel struct {
	Created int `json:"created"`
	DisplayName string `json:"displayName"`
	Id string `json:"id"`
	Object string `json:"object"`
	OwnedBy string `json:"owned_by"`
	VendorDisplayName string `json:"vendorDisplayName"`
}
