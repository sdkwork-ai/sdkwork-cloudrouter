package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class GoogleFunctionCall {
    private Map<String, Object> args;
    private String name;

    public Map<String, Object> getArgs() {
        return this.args;
    }

    public void setArgs(Map<String, Object> args) {
        this.args = args;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
