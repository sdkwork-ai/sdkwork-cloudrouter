using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAiModelCreateRequest
    {
        public string? ApiFormat { get; set; }
        public string? CapabilityIntro { get; set; }
        public string ContextTokens { get; set; }
        public string? Description { get; set; }
        public string? DisplayName { get; set; }
        public List<string>? InputModalities { get; set; }
        public List<string>? Limitations { get; set; }
        public string? MaxOutputTokens { get; set; }
        public List<string>? Modalities { get; set; }
        public string Model { get; set; }
        public List<string>? OutputModalities { get; set; }
        public List<AdminAiModelRegionPrice> RegionPrices { get; set; }
        public string? ReleaseStage { get; set; }
        public string? ReplacementModel { get; set; }
        public string? RoutingState { get; set; }
        public string? ShelfState { get; set; }
        public List<string>? SupportedLanguages { get; set; }
        public bool? SupportsJsonSchema { get; set; }
        public bool? SupportsStreaming { get; set; }
        public bool? SupportsTools { get; set; }
        public string? TrainingDataCutoff { get; set; }
        public string Type { get; set; }
        public List<string>? UseCases { get; set; }
        public string VendorId { get; set; }
    }
}
