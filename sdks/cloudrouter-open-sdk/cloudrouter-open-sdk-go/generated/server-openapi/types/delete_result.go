package types

// Delete result schema exposed by Cloud Router.
type DeleteResult struct {
	Deleted bool `json:"deleted"`
	Id string `json:"id"`
	Object string `json:"object"`
}
