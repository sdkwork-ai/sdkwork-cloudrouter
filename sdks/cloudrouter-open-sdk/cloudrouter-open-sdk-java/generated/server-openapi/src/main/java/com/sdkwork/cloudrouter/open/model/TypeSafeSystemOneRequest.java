package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class TypeSafeSystemOneRequest {
    private String model;
    private Map<String, TypeSafeQuestion> questions;
    private String state;

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Map<String, TypeSafeQuestion> getQuestions() {
        return this.questions;
    }

    public void setQuestions(Map<String, TypeSafeQuestion> questions) {
        this.questions = questions;
    }

    public String getState() {
        return this.state;
    }

    public void setState(String state) {
        this.state = state;
    }
}
