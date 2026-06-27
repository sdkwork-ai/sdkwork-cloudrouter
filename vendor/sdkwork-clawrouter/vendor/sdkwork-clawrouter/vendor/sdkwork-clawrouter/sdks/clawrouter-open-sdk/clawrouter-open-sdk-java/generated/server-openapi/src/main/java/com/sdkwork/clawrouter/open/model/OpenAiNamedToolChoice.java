package com.sdkwork.clawrouter.open.model;


public class OpenAiNamedToolChoice {
    private OpenAiNamedToolChoiceFunction function;
    private String type;

    public OpenAiNamedToolChoiceFunction getFunction() {
        return this.function;
    }

    public void setFunction(OpenAiNamedToolChoiceFunction function) {
        this.function = function;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
