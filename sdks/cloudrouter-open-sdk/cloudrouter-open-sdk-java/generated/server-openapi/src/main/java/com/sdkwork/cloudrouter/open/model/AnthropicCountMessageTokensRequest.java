package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class AnthropicCountMessageTokensRequest {
    private AnthropicCacheControl cacheControl;
    private List<AnthropicMessageParam> messages;
    private String model;
    private AnthropicOutputConfig outputConfig;
    private String speed;
    private String system;
    private AnthropicThinkingConfig thinking;
    private AnthropicToolChoice toolChoice;
    private List<AnthropicTool> tools;

    public AnthropicCacheControl getCacheControl() {
        return this.cacheControl;
    }

    public void setCacheControl(AnthropicCacheControl cacheControl) {
        this.cacheControl = cacheControl;
    }

    public List<AnthropicMessageParam> getMessages() {
        return this.messages;
    }

    public void setMessages(List<AnthropicMessageParam> messages) {
        this.messages = messages;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public AnthropicOutputConfig getOutputConfig() {
        return this.outputConfig;
    }

    public void setOutputConfig(AnthropicOutputConfig outputConfig) {
        this.outputConfig = outputConfig;
    }

    public String getSpeed() {
        return this.speed;
    }

    public void setSpeed(String speed) {
        this.speed = speed;
    }

    public String getSystem() {
        return this.system;
    }

    public void setSystem(String system) {
        this.system = system;
    }

    public AnthropicThinkingConfig getThinking() {
        return this.thinking;
    }

    public void setThinking(AnthropicThinkingConfig thinking) {
        this.thinking = thinking;
    }

    public AnthropicToolChoice getToolChoice() {
        return this.toolChoice;
    }

    public void setToolChoice(AnthropicToolChoice toolChoice) {
        this.toolChoice = toolChoice;
    }

    public List<AnthropicTool> getTools() {
        return this.tools;
    }

    public void setTools(List<AnthropicTool> tools) {
        this.tools = tools;
    }
}
