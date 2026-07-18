using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiEmbedding
    {
        public List<double> Embedding { get; set; }
        public int Index { get; set; }
        public string Object { get; set; }
    }
}
