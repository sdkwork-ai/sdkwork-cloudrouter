using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiAnnotation
    {
        public int? EndIndex { get; set; }
        public string? FileId { get; set; }
        public string? Filename { get; set; }
        public int? Index { get; set; }
        public int? StartIndex { get; set; }
        public string? Title { get; set; }
        public string? Type { get; set; }
        public string? Url { get; set; }
    }
}
