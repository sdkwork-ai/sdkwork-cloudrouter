using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class PixverseTaskResp
    {
        public string? AspectRatio { get; set; }
        public string? CreateTime { get; set; }
        public int? Credits { get; set; }
        public Dictionary<string, string>? CustomerPaths { get; set; }
        public int? Duration { get; set; }
        public bool? HasAudio { get; set; }
        public int? Id { get; set; }
        public string? ModifyTime { get; set; }
        public string? NegativePrompt { get; set; }
        public int? OutputHeight { get; set; }
        public int? OutputWidth { get; set; }
        public string? Path { get; set; }
        public string? Prompt { get; set; }
        public string? Quality { get; set; }
        public int? ResolutionRatio { get; set; }
        public int? Seed { get; set; }
        public int? Size { get; set; }
        public int? Status { get; set; }
        public string? Style { get; set; }
        public string? Url { get; set; }
        public int? VideoId { get; set; }
    }
}
