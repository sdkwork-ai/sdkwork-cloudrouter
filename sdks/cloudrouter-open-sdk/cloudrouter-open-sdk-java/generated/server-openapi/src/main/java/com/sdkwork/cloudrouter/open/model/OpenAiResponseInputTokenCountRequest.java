package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class OpenAiResponseInputTokenCountRequest {
    private String conversation;
    private String input;
    private String instructions;
    private String model;
    private Boolean parallelToolCalls;
    private String personality;
    private String previousResponseId;
    private String reasoning;
    private String text;
    private String toolChoice;
    private List<String> tools;
    private String truncation;

    public String getConversation() {
        return this.conversation;
    }

    public void setConversation(String conversation) {
        this.conversation = conversation;
    }

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

    public Boolean getParallelToolCalls() {
        return this.parallelToolCalls;
    }

    public void setParallelToolCalls(Boolean parallelToolCalls) {
        this.parallelToolCalls = parallelToolCalls;
    }

    public String getPersonality() {
        return this.personality;
    }

    public void setPersonality(String personality) {
        this.personality = personality;
    }

    public String getPreviousResponseId() {
        return this.previousResponseId;
    }

    public void setPreviousResponseId(String previousResponseId) {
        this.previousResponseId = previousResponseId;
    }

    public String getReasoning() {
        return this.reasoning;
    }

    public void setReasoning(String reasoning) {
        this.reasoning = reasoning;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getToolChoice() {
        return this.toolChoice;
    }

    public void setToolChoice(String toolChoice) {
        this.toolChoice = toolChoice;
    }

    public List<String> getTools() {
        return this.tools;
    }

    public void setTools(List<String> tools) {
        this.tools = tools;
    }

    public String getTruncation() {
        return this.truncation;
    }

    public void setTruncation(String truncation) {
        this.truncation = truncation;
    }
}
