package com.sdkwork.clawrouter.open.model;


public class OpenAiJsonSchemaFormat {
    private String description;
    private String name;
    private OpenAiJsonSchema schema;
    private Boolean strict;

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public OpenAiJsonSchema getSchema() {
        return this.schema;
    }

    public void setSchema(OpenAiJsonSchema schema) {
        this.schema = schema;
    }

    public Boolean getStrict() {
        return this.strict;
    }

    public void setStrict(Boolean strict) {
        this.strict = strict;
    }
}
