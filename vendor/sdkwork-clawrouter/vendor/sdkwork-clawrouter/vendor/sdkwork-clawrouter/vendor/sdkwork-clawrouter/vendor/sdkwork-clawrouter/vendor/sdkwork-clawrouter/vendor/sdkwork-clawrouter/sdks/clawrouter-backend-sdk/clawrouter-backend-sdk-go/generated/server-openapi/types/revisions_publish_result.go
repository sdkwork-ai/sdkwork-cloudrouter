package types

// Revisions publish result schema exposed by Claw Router.
type RevisionsPublishResult struct {
	Code string `json:"code"`
	Data AdminMcpServerRevisionMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
