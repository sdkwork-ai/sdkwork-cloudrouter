package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class GoogleTool {
    private GoogleCodeExecutionTool codeExecution;
    private Map<String, String> computerUse;
    private Map<String, String> fileSearch;
    private List<GoogleFunctionDeclaration> functionDeclarations;
    private Map<String, String> googleMaps;
    private GoogleSearchTool googleSearch;
    private Map<String, String> googleSearchRetrieval;
    private List<Map<String, String>> mcpServers;
    private GoogleUrlContextTool urlContext;

    public GoogleCodeExecutionTool getCodeExecution() {
        return this.codeExecution;
    }

    public void setCodeExecution(GoogleCodeExecutionTool codeExecution) {
        this.codeExecution = codeExecution;
    }

    public Map<String, String> getComputerUse() {
        return this.computerUse;
    }

    public void setComputerUse(Map<String, String> computerUse) {
        this.computerUse = computerUse;
    }

    public Map<String, String> getFileSearch() {
        return this.fileSearch;
    }

    public void setFileSearch(Map<String, String> fileSearch) {
        this.fileSearch = fileSearch;
    }

    public List<GoogleFunctionDeclaration> getFunctionDeclarations() {
        return this.functionDeclarations;
    }

    public void setFunctionDeclarations(List<GoogleFunctionDeclaration> functionDeclarations) {
        this.functionDeclarations = functionDeclarations;
    }

    public Map<String, String> getGoogleMaps() {
        return this.googleMaps;
    }

    public void setGoogleMaps(Map<String, String> googleMaps) {
        this.googleMaps = googleMaps;
    }

    public GoogleSearchTool getGoogleSearch() {
        return this.googleSearch;
    }

    public void setGoogleSearch(GoogleSearchTool googleSearch) {
        this.googleSearch = googleSearch;
    }

    public Map<String, String> getGoogleSearchRetrieval() {
        return this.googleSearchRetrieval;
    }

    public void setGoogleSearchRetrieval(Map<String, String> googleSearchRetrieval) {
        this.googleSearchRetrieval = googleSearchRetrieval;
    }

    public List<Map<String, String>> getMcpServers() {
        return this.mcpServers;
    }

    public void setMcpServers(List<Map<String, String>> mcpServers) {
        this.mcpServers = mcpServers;
    }

    public GoogleUrlContextTool getUrlContext() {
        return this.urlContext;
    }

    public void setUrlContext(GoogleUrlContextTool urlContext) {
        this.urlContext = urlContext;
    }
}
