package types

// Admin ip limit create request schema exposed by Claw Router.
type AdminIpLimitCreateRequest struct {
	BlockDuration string `json:"blockDuration"`
	Rpm int `json:"rpm"`
	Rps int `json:"rps"`
	RuleName string `json:"ruleName"`
	Status string `json:"status"`
	TargetIp string `json:"targetIp"`
}
