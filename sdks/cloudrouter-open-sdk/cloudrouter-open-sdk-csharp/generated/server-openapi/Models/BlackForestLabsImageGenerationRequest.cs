using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class BlackForestLabsImageGenerationRequest
    {
        public string? AspectRatio { get; set; }
        public bool? AutoCrop { get; set; }
        public int? Bottom { get; set; }
        public int? DilatePixels { get; set; }
        public bool? DisablePup { get; set; }
        public string? FinetuneId { get; set; }
        public double? FinetuneStrength { get; set; }
        public string? Garment { get; set; }
        public bool? Grounding { get; set; }
        public double? Guidance { get; set; }
        public int? Height { get; set; }
        public string? Image { get; set; }
        public string? ImagePrompt { get; set; }
        public double? ImagePromptStrength { get; set; }
        public string? Images { get; set; }
        public string? InputImage { get; set; }
        public string? InputImage2 { get; set; }
        public string? InputImage3 { get; set; }
        public string? InputImage4 { get; set; }
        public string? InputImage5 { get; set; }
        public string? InputImage6 { get; set; }
        public string? InputImage7 { get; set; }
        public string? InputImage8 { get; set; }
        public string? InputImageBlobPath { get; set; }
        public int? Left { get; set; }
        public string? Mask { get; set; }
        public string? Mode { get; set; }
        public string? OutputFormat { get; set; }
        public string? Person { get; set; }
        public string Prompt { get; set; }
        public bool? PromptUpsampling { get; set; }
        public bool? Raw { get; set; }
        public int? ReferenceOffsetX { get; set; }
        public int? ReferenceOffsetY { get; set; }
        public string? Resolution { get; set; }
        public int? Right { get; set; }
        public int? SafetyTolerance { get; set; }
        public int? Seed { get; set; }
        public int? Steps { get; set; }
        public int? Top { get; set; }
        public string? User { get; set; }
        public string? Version { get; set; }
        public string? WebhookSecret { get; set; }
        public string? WebhookUrl { get; set; }
        public int? Width { get; set; }
    }
}
