package com.sdkwork.clawrouter.open.model;


public class OpenAiTool {
    private OpenAiFunctionDefinition function;
    private String type;

    public OpenAiFunctionDefinition getFunction() {
        return this.function;
    }

    public void setFunction(OpenAiFunctionDefinition function) {
        this.function = function;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
