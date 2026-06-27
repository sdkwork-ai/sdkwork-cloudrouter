package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class AnthropicContentBlock {
    private String id;
    private Map<String, String> input;
    private String name;
    private String text;
    private String type;

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

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
