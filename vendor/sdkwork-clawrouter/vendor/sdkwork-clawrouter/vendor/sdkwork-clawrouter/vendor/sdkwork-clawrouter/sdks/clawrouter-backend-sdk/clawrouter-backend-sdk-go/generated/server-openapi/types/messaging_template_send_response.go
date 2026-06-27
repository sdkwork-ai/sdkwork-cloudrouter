package types

// Messaging template send response schema exposed by Claw Router.
type MessagingTemplateSendResponse struct {
	DeliveryStatus string `json:"deliveryStatus"`
	ProviderCode string `json:"providerCode"`
	RequestId string `json:"requestId"`
}
