package com.sdkwork.clawrouter.open.model;


public class OpenAiToolCall {
    private OpenAiFunctionCall function;
    private String id;
    private String type;

    public OpenAiFunctionCall getFunction() {
        return this.function;
    }

    public void setFunction(OpenAiFunctionCall function) {
        this.function = function;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
