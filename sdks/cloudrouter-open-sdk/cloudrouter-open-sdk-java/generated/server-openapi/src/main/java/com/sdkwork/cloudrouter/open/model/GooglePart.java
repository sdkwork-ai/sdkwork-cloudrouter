package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class GooglePart {
    private Map<String, String> audioTranscription;
    private GoogleCodeExecutionResult codeExecutionResult;
    private GoogleExecutableCode executableCode;
    private GoogleFileData fileData;
    private GoogleFunctionCall functionCall;
    private GoogleFunctionResponse functionResponse;
    private GoogleBlob inlineData;
    private String mediaProcessing;
    private Map<String, String> mediaResolution;
    private Map<String, String> partMetadata;
    private Map<String, String> speechMetadata;
    private String text;
    private Boolean thought;
    private String thoughtSignature;
    private Map<String, String> toolCall;
    private Map<String, String> toolResponse;
    private Map<String, String> videoMetadata;

    public Map<String, String> getAudioTranscription() {
        return this.audioTranscription;
    }

    public void setAudioTranscription(Map<String, String> audioTranscription) {
        this.audioTranscription = audioTranscription;
    }

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

    public String getMediaProcessing() {
        return this.mediaProcessing;
    }

    public void setMediaProcessing(String mediaProcessing) {
        this.mediaProcessing = mediaProcessing;
    }

    public Map<String, String> getMediaResolution() {
        return this.mediaResolution;
    }

    public void setMediaResolution(Map<String, String> mediaResolution) {
        this.mediaResolution = mediaResolution;
    }

    public Map<String, String> getPartMetadata() {
        return this.partMetadata;
    }

    public void setPartMetadata(Map<String, String> partMetadata) {
        this.partMetadata = partMetadata;
    }

    public Map<String, String> getSpeechMetadata() {
        return this.speechMetadata;
    }

    public void setSpeechMetadata(Map<String, String> speechMetadata) {
        this.speechMetadata = speechMetadata;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Boolean getThought() {
        return this.thought;
    }

    public void setThought(Boolean thought) {
        this.thought = thought;
    }

    public String getThoughtSignature() {
        return this.thoughtSignature;
    }

    public void setThoughtSignature(String thoughtSignature) {
        this.thoughtSignature = thoughtSignature;
    }

    public Map<String, String> getToolCall() {
        return this.toolCall;
    }

    public void setToolCall(Map<String, String> toolCall) {
        this.toolCall = toolCall;
    }

    public Map<String, String> getToolResponse() {
        return this.toolResponse;
    }

    public void setToolResponse(Map<String, String> toolResponse) {
        this.toolResponse = toolResponse;
    }

    public Map<String, String> getVideoMetadata() {
        return this.videoMetadata;
    }

    public void setVideoMetadata(Map<String, String> videoMetadata) {
        this.videoMetadata = videoMetadata;
    }
}
