package types

// Messaging template create request schema exposed by Claw Router.
type MessagingTemplateCreateRequest struct {
	BodyTemplate string `json:"bodyTemplate"`
	Category string `json:"category"`
	Channel string `json:"channel"`
	ContentFormat string `json:"contentFormat"`
	DeliveryPurpose string `json:"deliveryPurpose"`
	Locale string `json:"locale"`
	SceneCode string `json:"sceneCode"`
	SubjectTemplate string `json:"subjectTemplate"`
	TemplateCode string `json:"templateCode"`
	TemplateName string `json:"templateName"`
	VariableSchema map[string]JsonValue `json:"variableSchema"`
}
