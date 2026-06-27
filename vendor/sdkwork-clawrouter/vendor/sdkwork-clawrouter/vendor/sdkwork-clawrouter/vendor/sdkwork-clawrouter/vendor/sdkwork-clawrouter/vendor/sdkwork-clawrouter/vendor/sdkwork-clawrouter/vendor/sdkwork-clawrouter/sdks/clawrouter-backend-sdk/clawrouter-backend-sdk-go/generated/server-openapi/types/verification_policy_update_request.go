package types

// Verification policy update request schema exposed by Claw Router.
type VerificationPolicyUpdateRequest struct {
	AllowedChannels []string `json:"allowedChannels"`
	CodeLength int `json:"codeLength"`
	DefaultChannel string `json:"defaultChannel"`
	MaxSendPerHour int `json:"maxSendPerHour"`
	MaxVerifyAttempts int `json:"maxVerifyAttempts"`
	ResendIntervalSeconds int `json:"resendIntervalSeconds"`
	RiskPolicy map[string]JsonValue `json:"riskPolicy"`
	TemplateCode string `json:"templateCode"`
	TtlSeconds int `json:"ttlSeconds"`
}
