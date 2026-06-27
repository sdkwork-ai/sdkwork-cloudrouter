package com.sdkwork.clawrouter.open.model;


public class OpenAiFineTuningGraderRunRequest {
    private String grader;
    private String input;
    private String modelSample;
    private String referenceAnswer;

    public String getGrader() {
        return this.grader;
    }

    public void setGrader(String grader) {
        this.grader = grader;
    }

    public String getInput() {
        return this.input;
    }

    public void setInput(String input) {
        this.input = input;
    }

    public String getModelSample() {
        return this.modelSample;
    }

    public void setModelSample(String modelSample) {
        this.modelSample = modelSample;
    }

    public String getReferenceAnswer() {
        return this.referenceAnswer;
    }

    public void setReferenceAnswer(String referenceAnswer) {
        this.referenceAnswer = referenceAnswer;
    }
}
