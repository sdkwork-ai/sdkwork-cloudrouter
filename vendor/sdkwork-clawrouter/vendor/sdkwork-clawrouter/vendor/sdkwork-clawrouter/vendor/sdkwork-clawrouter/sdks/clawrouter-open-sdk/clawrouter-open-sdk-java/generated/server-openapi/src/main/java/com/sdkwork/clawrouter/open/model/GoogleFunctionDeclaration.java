package com.sdkwork.clawrouter.open.model;


public class GoogleFunctionDeclaration {
    private String description;
    private String name;
    private GoogleSchema parameters;
    private GoogleSchema response;

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

    public GoogleSchema getParameters() {
        return this.parameters;
    }

    public void setParameters(GoogleSchema parameters) {
        this.parameters = parameters;
    }

    public GoogleSchema getResponse() {
        return this.response;
    }

    public void setResponse(GoogleSchema response) {
        this.response = response;
    }
}
