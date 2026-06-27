package types

// App channel group list response schema exposed by Claw Router.
type AppChannelGroupListResponse struct {
	Items []AppChannelGroup `json:"items"`
}
