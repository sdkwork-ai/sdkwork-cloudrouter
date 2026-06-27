package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiEvalRun {
    private Integer createdAt;
    private String dataSource;
    private String evalId;
    private String id;
    private Map<String, String> metadata;
    private String name;
    private String object;
    private String reportUrl;
    private OpenAiEvalRunResultCounts resultCounts;
    private String status;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getDataSource() {
        return this.dataSource;
    }

    public void setDataSource(String dataSource) {
        this.dataSource = dataSource;
    }

    public String getEvalId() {
        return this.evalId;
    }

    public void setEvalId(String evalId) {
        this.evalId = evalId;
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

    public String getReportUrl() {
        return this.reportUrl;
    }

    public void setReportUrl(String reportUrl) {
        this.reportUrl = reportUrl;
    }

    public OpenAiEvalRunResultCounts getResultCounts() {
        return this.resultCounts;
    }

    public void setResultCounts(OpenAiEvalRunResultCounts resultCounts) {
        this.resultCounts = resultCounts;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
