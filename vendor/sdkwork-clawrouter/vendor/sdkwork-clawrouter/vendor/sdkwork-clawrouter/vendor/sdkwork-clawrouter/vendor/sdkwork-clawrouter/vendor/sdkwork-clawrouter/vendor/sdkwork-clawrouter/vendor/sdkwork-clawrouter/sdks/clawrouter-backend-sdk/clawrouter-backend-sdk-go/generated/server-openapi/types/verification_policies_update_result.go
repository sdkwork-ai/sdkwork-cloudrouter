package types

// Verification policies update result schema exposed by Claw Router.
type VerificationPoliciesUpdateResult struct {
	Code string `json:"code"`
	Data MessagingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
