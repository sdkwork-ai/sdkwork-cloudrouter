package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiEvalRunCreateRequest {
    private String dataSource;
    private Map<String, String> metadata;
    private String name;

    public String getDataSource() {
        return this.dataSource;
    }

    public void setDataSource(String dataSource) {
        this.dataSource = dataSource;
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
}
