package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class GoogleSchema {
    private String description;
    private List<String> enum_;
    private String format;
    private Object items;
    private Boolean nullable;
    private Map<String, Object> properties;
    private List<String> required;
    private String type;

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

    public String getFormat() {
        return this.format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public Object getItems() {
        return this.items;
    }

    public void setItems(Object items) {
        this.items = items;
    }

    public Boolean getNullable() {
        return this.nullable;
    }

    public void setNullable(Boolean nullable) {
        this.nullable = nullable;
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
