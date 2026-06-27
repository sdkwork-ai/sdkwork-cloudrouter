package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiEval {
    private Integer createdAt;
    private String dataSourceConfig;
    private String id;
    private Map<String, String> metadata;
    private String name;
    private String object;
    private List<String> testingCriteria;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getDataSourceConfig() {
        return this.dataSourceConfig;
    }

    public void setDataSourceConfig(String dataSourceConfig) {
        this.dataSourceConfig = dataSourceConfig;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
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

    public List<String> getTestingCriteria() {
        return this.testingCriteria;
    }

    public void setTestingCriteria(List<String> testingCriteria) {
        this.testingCriteria = testingCriteria;
    }
}
