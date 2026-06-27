package com.sdkwork.clawrouter.open.model;


public class AnthropicTool {
    private String description;
    private ProviderJsonSchema inputSchema;
    private String name;

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ProviderJsonSchema getInputSchema() {
        return this.inputSchema;
    }

    public void setInputSchema(ProviderJsonSchema inputSchema) {
        this.inputSchema = inputSchema;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
