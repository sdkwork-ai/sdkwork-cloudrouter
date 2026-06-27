package com.sdkwork.clawrouter.open.model;


public class OpenAiResponseFormat {
    private OpenAiJsonSchemaFormat jsonSchema;
    private String type;

    public OpenAiJsonSchemaFormat getJsonSchema() {
        return this.jsonSchema;
    }

    public void setJsonSchema(OpenAiJsonSchemaFormat jsonSchema) {
        this.jsonSchema = jsonSchema;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
