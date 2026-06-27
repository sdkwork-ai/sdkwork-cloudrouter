package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class AnthropicContentBlockParam {
    private String content;
    private String id;
    private Map<String, String> input;
    private String name;
    private AnthropicContentSource source;
    private String text;
    private String toolUseId;
    private String type;

    public String getContent() {
        return this.content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Map<String, String> getInput() {
        return this.input;
    }

    public void setInput(Map<String, String> input) {
        this.input = input;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public AnthropicContentSource getSource() {
        return this.source;
    }

    public void setSource(AnthropicContentSource source) {
        this.source = source;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getToolUseId() {
        return this.toolUseId;
    }

    public void setToolUseId(String toolUseId) {
        this.toolUseId = toolUseId;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
