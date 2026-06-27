package types

// Admin auth verification policy schema exposed by Claw Router.
type AdminAuthVerificationPolicy struct {
	EmailCodeLoginEnabled bool `json:"emailCodeLoginEnabled"`
	EmailRegistrationVerificationRequired bool `json:"emailRegistrationVerificationRequired"`
	PhoneCodeLoginEnabled bool `json:"phoneCodeLoginEnabled"`
	PhoneRegistrationVerificationRequired bool `json:"phoneRegistrationVerificationRequired"`
}
