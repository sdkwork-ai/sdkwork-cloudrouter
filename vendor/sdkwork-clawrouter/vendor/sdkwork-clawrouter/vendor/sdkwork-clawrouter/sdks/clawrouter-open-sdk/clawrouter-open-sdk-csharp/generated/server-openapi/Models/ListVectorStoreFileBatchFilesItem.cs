using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class ListVectorStoreFileBatchFilesItem
    {
        public int? Created { get; set; }
        public int? CreatedAt { get; set; }
        public string? FileId { get; set; }
        public List<string>? FileIds { get; set; }
        public string? Id { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Name { get; set; }
        public string? Object { get; set; }
        public string? Status { get; set; }
        public int? UsageBytes { get; set; }
    }
}
