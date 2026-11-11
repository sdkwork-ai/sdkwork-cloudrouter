package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class TypeSafeSystemOneResponse {
    private Map<String, TypeSafeAnswer> answers;
    private String model;
    private TypeSafeUsage usage;

    public Map<String, TypeSafeAnswer> getAnswers() {
        return this.answers;
    }

    public void setAnswers(Map<String, TypeSafeAnswer> answers) {
        this.answers = answers;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public TypeSafeUsage getUsage() {
        return this.usage;
    }

    public void setUsage(TypeSafeUsage usage) {
        this.usage = usage;
    }
}
