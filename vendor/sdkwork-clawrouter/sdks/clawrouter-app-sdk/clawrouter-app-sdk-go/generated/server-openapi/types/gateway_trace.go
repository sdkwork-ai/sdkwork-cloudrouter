package types

// Gateway trace schema exposed by Claw Router.
type GatewayTrace struct {
	Channel string `json:"channel"`
	Duration string `json:"duration"`
	Endpoint string `json:"endpoint"`
	Id string `json:"id"`
	Ip string `json:"ip"`
	Method string `json:"method"`
	Status int `json:"status"`
	Time string `json:"time"`
}
