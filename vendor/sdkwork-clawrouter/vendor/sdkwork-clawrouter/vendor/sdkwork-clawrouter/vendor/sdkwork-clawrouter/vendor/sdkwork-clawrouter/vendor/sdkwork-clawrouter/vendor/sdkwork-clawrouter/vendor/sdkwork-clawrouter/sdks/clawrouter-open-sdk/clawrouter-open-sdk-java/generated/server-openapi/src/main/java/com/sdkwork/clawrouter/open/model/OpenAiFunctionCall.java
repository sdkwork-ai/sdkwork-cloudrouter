package com.sdkwork.clawrouter.open.model;


public class OpenAiFunctionCall {
    private String arguments;
    private String name;

    public String getArguments() {
        return this.arguments;
    }

    public void setArguments(String arguments) {
        this.arguments = arguments;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
