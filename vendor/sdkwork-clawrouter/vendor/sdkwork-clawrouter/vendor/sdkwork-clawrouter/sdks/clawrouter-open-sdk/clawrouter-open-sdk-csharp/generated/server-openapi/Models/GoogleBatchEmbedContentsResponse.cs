using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleBatchEmbedContentsResponse
    {
        public List<GoogleContentEmbedding>? Embeddings { get; set; }
    }
}
