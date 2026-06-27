package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleTool {
    private GoogleCodeExecutionTool codeExecution;
    private List<GoogleFunctionDeclaration> functionDeclarations;
    private GoogleSearchTool googleSearch;
    private GoogleUrlContextTool urlContext;

    public GoogleCodeExecutionTool getCodeExecution() {
        return this.codeExecution;
    }

    public void setCodeExecution(GoogleCodeExecutionTool codeExecution) {
        this.codeExecution = codeExecution;
    }

    public List<GoogleFunctionDeclaration> getFunctionDeclarations() {
        return this.functionDeclarations;
    }

    public void setFunctionDeclarations(List<GoogleFunctionDeclaration> functionDeclarations) {
        this.functionDeclarations = functionDeclarations;
    }

    public GoogleSearchTool getGoogleSearch() {
        return this.googleSearch;
    }

    public void setGoogleSearch(GoogleSearchTool googleSearch) {
        this.googleSearch = googleSearch;
    }

    public GoogleUrlContextTool getUrlContext() {
        return this.urlContext;
    }

    public void setUrlContext(GoogleUrlContextTool urlContext) {
        this.urlContext = urlContext;
    }
}
