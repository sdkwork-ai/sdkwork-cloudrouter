package com.sdkwork.clawrouter.open.model;


public class OpenAiModerationCreateRequest {
    private String input;
    private String model;

    public String getInput() {
        return this.input;
    }

    public void setInput(String input) {
        this.input = input;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }
}
