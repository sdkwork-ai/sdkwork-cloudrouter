using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MinimaxImageData
    {
        public List<string>? ImageBase64 { get; set; }
        public List<string>? ImageUrls { get; set; }
    }
}
