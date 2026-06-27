package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiResponseOutputContent {
    private List<OpenAiAnnotation> annotations;
    private String refusal;
    private String text;
    private String type;

    public List<OpenAiAnnotation> getAnnotations() {
        return this.annotations;
    }

    public void setAnnotations(List<OpenAiAnnotation> annotations) {
        this.annotations = annotations;
    }

    public String getRefusal() {
        return this.refusal;
    }

    public void setRefusal(String refusal) {
        this.refusal = refusal;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
