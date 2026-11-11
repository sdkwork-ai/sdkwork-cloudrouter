package com.sdkwork.cloudrouter.open.model;


public class AnthropicToolChoice {
    private Boolean disableParallelToolUse;
    private String name;
    private String type;

    public Boolean getDisableParallelToolUse() {
        return this.disableParallelToolUse;
    }

    public void setDisableParallelToolUse(Boolean disableParallelToolUse) {
        this.disableParallelToolUse = disableParallelToolUse;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
