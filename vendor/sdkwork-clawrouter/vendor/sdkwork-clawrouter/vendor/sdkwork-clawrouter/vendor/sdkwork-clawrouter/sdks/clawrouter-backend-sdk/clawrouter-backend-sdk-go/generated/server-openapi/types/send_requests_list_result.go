package types

// Send requests list result schema exposed by Claw Router.
type SendRequestsListResult struct {
	Code string `json:"code"`
	Data MessagingCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
