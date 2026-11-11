package com.sdkwork.cloudrouter.open.model;


public class AnthropicOutputFormat {
    private ProviderJsonSchema schema;
    private String type;

    public ProviderJsonSchema getSchema() {
        return this.schema;
    }

    public void setSchema(ProviderJsonSchema schema) {
        this.schema = schema;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
