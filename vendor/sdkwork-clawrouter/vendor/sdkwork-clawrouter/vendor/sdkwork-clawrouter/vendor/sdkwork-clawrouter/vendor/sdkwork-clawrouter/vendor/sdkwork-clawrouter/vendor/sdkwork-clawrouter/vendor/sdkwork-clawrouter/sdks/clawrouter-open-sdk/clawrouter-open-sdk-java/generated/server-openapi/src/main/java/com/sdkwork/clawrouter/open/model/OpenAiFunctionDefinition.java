package com.sdkwork.clawrouter.open.model;


public class OpenAiFunctionDefinition {
    private String description;
    private String name;
    private OpenAiJsonSchema parameters;
    private Boolean strict;

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public OpenAiJsonSchema getParameters() {
        return this.parameters;
    }

    public void setParameters(OpenAiJsonSchema parameters) {
        this.parameters = parameters;
    }

    public Boolean getStrict() {
        return this.strict;
    }

    public void setStrict(Boolean strict) {
        this.strict = strict;
    }
}
