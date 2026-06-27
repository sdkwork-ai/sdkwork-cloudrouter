package types

// Delete api key response schema exposed by Claw Router.
type DeleteApiKeyResponse struct {
	Deleted bool `json:"deleted"`
	Id string `json:"id"`
}
