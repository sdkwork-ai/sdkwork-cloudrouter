package types

// Admin token limit create request schema exposed by Claw Router.
type AdminTokenLimitCreateRequest struct {
	Burst int `json:"burst"`
	KeyPrefix string `json:"keyPrefix"`
	Rpd int `json:"rpd"`
	Rps int `json:"rps"`
	Status string `json:"status"`
	User string `json:"user"`
}
