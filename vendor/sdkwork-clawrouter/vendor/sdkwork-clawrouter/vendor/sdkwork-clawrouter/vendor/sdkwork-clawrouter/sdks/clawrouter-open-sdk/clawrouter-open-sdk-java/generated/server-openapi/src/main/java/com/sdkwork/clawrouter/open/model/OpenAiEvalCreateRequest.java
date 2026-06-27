package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiEvalCreateRequest {
    private String dataSource;
    private String dataSourceConfig;
    private Map<String, String> metadata;
    private String name;
    private List<String> testingCriteria;

    public String getDataSource() {
        return this.dataSource;
    }

    public void setDataSource(String dataSource) {
        this.dataSource = dataSource;
    }

    public String getDataSourceConfig() {
        return this.dataSourceConfig;
    }

    public void setDataSourceConfig(String dataSourceConfig) {
        this.dataSourceConfig = dataSourceConfig;
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

    public List<String> getTestingCriteria() {
        return this.testingCriteria;
    }

    public void setTestingCriteria(List<String> testingCriteria) {
        this.testingCriteria = testingCriteria;
    }
}
