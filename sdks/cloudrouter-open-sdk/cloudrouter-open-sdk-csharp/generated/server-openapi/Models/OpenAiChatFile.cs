using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiChatFile
    {
        public string? FileData { get; set; }
        public string? FileId { get; set; }
        public string? Filename { get; set; }
    }
}
