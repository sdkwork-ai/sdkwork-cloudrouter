using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleCountTokensRequest
    {
        public List<GoogleContent>? Contents { get; set; }
        public GoogleGenerateContentRequest? GenerateContentRequest { get; set; }
    }
}
