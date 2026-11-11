package types

// One skill loaded into an Anthropic container.
type AnthropicSkill struct {
	SkillId string `json:"skill_id"`
	Type string `json:"type"`
	Version string `json:"version"`
}
