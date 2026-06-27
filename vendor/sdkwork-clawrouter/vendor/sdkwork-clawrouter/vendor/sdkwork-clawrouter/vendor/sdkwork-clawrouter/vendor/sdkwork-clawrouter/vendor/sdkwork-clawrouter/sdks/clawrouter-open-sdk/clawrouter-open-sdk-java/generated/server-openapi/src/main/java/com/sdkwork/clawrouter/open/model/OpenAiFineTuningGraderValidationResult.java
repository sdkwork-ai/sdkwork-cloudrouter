package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiFineTuningGraderValidationResult {
    private List<String> errors;
    private Boolean valid;
    private List<String> warnings;

    public List<String> getErrors() {
        return this.errors;
    }

    public void setErrors(List<String> errors) {
        this.errors = errors;
    }

    public Boolean getValid() {
        return this.valid;
    }

    public void setValid(Boolean valid) {
        this.valid = valid;
    }

    public List<String> getWarnings() {
        return this.warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }
}
