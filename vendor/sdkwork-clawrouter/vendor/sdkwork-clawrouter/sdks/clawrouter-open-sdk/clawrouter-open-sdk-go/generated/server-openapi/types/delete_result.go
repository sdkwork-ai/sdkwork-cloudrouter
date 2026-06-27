package types

// Delete result schema exposed by Claw Router.
type DeleteResult struct {
	Deleted bool `json:"deleted"`
	Id string `json:"id"`
	Object string `json:"object"`
}
