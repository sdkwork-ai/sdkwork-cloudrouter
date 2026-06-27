using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiEmbeddingList
    {
        public List<OpenAiEmbedding>? Data { get; set; }
        public string? Model { get; set; }
        public string? Object { get; set; }
        public OpenAiEmbeddingUsage? Usage { get; set; }
    }
}
