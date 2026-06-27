package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleBatchEmbedContentsResponse {
    private List<GoogleContentEmbedding> embeddings;

    public List<GoogleContentEmbedding> getEmbeddings() {
        return this.embeddings;
    }

    public void setEmbeddings(List<GoogleContentEmbedding> embeddings) {
        this.embeddings = embeddings;
    }
}
