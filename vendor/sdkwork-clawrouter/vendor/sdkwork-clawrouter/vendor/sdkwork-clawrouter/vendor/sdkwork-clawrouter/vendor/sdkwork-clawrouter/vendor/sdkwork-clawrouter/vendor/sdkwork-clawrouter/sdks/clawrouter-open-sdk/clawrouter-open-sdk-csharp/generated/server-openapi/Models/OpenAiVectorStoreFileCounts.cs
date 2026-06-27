using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVectorStoreFileCounts
    {
        public int? Cancelled { get; set; }
        public int? Completed { get; set; }
        public int? Failed { get; set; }
        public int? InProgress { get; set; }
        public int? Total { get; set; }
    }
}
