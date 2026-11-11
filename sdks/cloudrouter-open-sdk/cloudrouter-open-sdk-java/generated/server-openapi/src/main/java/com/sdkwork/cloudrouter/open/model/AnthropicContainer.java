package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class AnthropicContainer {
    private String id;
    private List<AnthropicSkill> skills;

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public List<AnthropicSkill> getSkills() {
        return this.skills;
    }

    public void setSkills(List<AnthropicSkill> skills) {
        this.skills = skills;
    }
}
