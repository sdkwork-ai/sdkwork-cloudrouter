package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiResponseInputTokenCountRequest {
    private String input;
    private String instructions;
    private String model;
    private List<String> tools;

    public String getInput() {
        return this.input;
    }

    public void setInput(String input) {
        this.input = input;
    }

    public String getInstructions() {
        return this.instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public List<String> getTools() {
        return this.tools;
    }

    public void setTools(List<String> tools) {
        this.tools = tools;
    }
}
