package com.sdkwork.clawrouter.open.model;


public class GooglePart {
    private GoogleCodeExecutionResult codeExecutionResult;
    private GoogleExecutableCode executableCode;
    private GoogleFileData fileData;
    private GoogleFunctionCall functionCall;
    private GoogleFunctionResponse functionResponse;
    private GoogleBlob inlineData;
    private String text;

    public GoogleCodeExecutionResult getCodeExecutionResult() {
        return this.codeExecutionResult;
    }

    public void setCodeExecutionResult(GoogleCodeExecutionResult codeExecutionResult) {
        this.codeExecutionResult = codeExecutionResult;
    }

    public GoogleExecutableCode getExecutableCode() {
        return this.executableCode;
    }

    public void setExecutableCode(GoogleExecutableCode executableCode) {
        this.executableCode = executableCode;
    }

    public GoogleFileData getFileData() {
        return this.fileData;
    }

    public void setFileData(GoogleFileData fileData) {
        this.fileData = fileData;
    }

    public GoogleFunctionCall getFunctionCall() {
        return this.functionCall;
    }

    public void setFunctionCall(GoogleFunctionCall functionCall) {
        this.functionCall = functionCall;
    }

    public GoogleFunctionResponse getFunctionResponse() {
        return this.functionResponse;
    }

    public void setFunctionResponse(GoogleFunctionResponse functionResponse) {
        this.functionResponse = functionResponse;
    }

    public GoogleBlob getInlineData() {
        return this.inlineData;
    }

    public void setInlineData(GoogleBlob inlineData) {
        this.inlineData = inlineData;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }
}
