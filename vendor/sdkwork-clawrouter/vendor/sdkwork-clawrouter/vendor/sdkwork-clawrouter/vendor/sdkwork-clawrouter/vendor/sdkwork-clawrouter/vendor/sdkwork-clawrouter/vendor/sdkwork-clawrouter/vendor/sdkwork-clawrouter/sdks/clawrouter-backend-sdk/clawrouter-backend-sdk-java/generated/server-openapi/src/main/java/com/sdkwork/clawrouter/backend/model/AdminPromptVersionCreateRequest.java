package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class AdminPromptVersionCreateRequest {
    private String content;
    private List<Map<String, String>> examplesJson;
    private Map<String, String> modelConstraints;
    private Map<String, String> outputSchema;
    private Map<String, String> safetyPolicy;
    private String title;
    private Map<String, String> variableSchema;
    private String versionNo;

    public String getContent() {
        return this.content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public List<Map<String, String>> getExamplesJson() {
        return this.examplesJson;
    }

    public void setExamplesJson(List<Map<String, String>> examplesJson) {
        this.examplesJson = examplesJson;
    }

    public Map<String, String> getModelConstraints() {
        return this.modelConstraints;
    }

    public void setModelConstraints(Map<String, String> modelConstraints) {
        this.modelConstraints = modelConstraints;
    }

    public Map<String, String> getOutputSchema() {
        return this.outputSchema;
    }

    public void setOutputSchema(Map<String, String> outputSchema) {
        this.outputSchema = outputSchema;
    }

    public Map<String, String> getSafetyPolicy() {
        return this.safetyPolicy;
    }

    public void setSafetyPolicy(Map<String, String> safetyPolicy) {
        this.safetyPolicy = safetyPolicy;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Map<String, String> getVariableSchema() {
        return this.variableSchema;
    }

    public void setVariableSchema(Map<String, String> variableSchema) {
        this.variableSchema = variableSchema;
    }

    public String getVersionNo() {
        return this.versionNo;
    }

    public void setVersionNo(String versionNo) {
        this.versionNo = versionNo;
    }
}
