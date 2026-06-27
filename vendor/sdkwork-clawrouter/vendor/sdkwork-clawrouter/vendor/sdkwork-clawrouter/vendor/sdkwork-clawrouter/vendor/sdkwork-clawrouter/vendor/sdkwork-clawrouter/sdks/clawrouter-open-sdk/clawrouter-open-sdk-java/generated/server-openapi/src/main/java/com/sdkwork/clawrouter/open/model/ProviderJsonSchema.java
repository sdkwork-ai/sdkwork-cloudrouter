package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class ProviderJsonSchema {
    private Boolean additionalProperties;
    private String description;
    private List<String> enum_;
    private Object items;
    private Map<String, Object> properties;
    private List<String> required;
    private String type;

    public Boolean getAdditionalProperties() {
        return this.additionalProperties;
    }

    public void setAdditionalProperties(Boolean additionalProperties) {
        this.additionalProperties = additionalProperties;
    }

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getEnum_() {
        return this.enum_;
    }

    public void setEnum_(List<String> enum_) {
        this.enum_ = enum_;
    }

    public Object getItems() {
        return this.items;
    }

    public void setItems(Object items) {
        this.items = items;
    }

    public Map<String, Object> getProperties() {
        return this.properties;
    }

    public void setProperties(Map<String, Object> properties) {
        this.properties = properties;
    }

    public List<String> getRequired() {
        return this.required;
    }

    public void setRequired(List<String> required) {
        this.required = required;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
