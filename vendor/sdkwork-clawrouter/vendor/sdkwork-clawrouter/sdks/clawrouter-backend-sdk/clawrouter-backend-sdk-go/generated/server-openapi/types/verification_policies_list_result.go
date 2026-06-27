package types

// Verification policies list result schema exposed by Claw Router.
type VerificationPoliciesListResult struct {
	Code string `json:"code"`
	Data MessagingCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
