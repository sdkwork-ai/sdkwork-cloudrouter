package types

// Suppressions list result schema exposed by Claw Router.
type SuppressionsListResult struct {
	Code string `json:"code"`
	Data MessagingCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
