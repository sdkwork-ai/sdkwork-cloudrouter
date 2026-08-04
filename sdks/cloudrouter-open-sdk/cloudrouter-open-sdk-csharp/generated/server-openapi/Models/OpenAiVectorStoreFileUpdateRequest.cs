using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiVectorStoreFileUpdateRequest
    {
        public Dictionary<string, string>? Attributes { get; set; }
    }
}
