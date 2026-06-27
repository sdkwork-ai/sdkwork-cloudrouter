using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVectorStoreFileBatch
    {
        public int? CreatedAt { get; set; }
        public OpenAiVectorStoreFileCounts? FileCounts { get; set; }
        public string? Id { get; set; }
        public string? Object { get; set; }
        public string? Status { get; set; }
        public string? VectorStoreId { get; set; }
    }
}
