package com.sdkwork.clawrouter.open.model;


public class OpenAiOrganizationAdminApiKey {
    private Integer createdAt;
    private String id;
    private Integer lastUsedAt;
    private String name;
    private String object;
    private String owner;
    private String redactedValue;
    private String value;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getLastUsedAt() {
        return this.lastUsedAt;
    }

    public void setLastUsedAt(Integer lastUsedAt) {
        this.lastUsedAt = lastUsedAt;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public String getOwner() {
        return this.owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
    }

    public String getRedactedValue() {
        return this.redactedValue;
    }

    public void setRedactedValue(String redactedValue) {
        this.redactedValue = redactedValue;
    }

    public String getValue() {
        return this.value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
