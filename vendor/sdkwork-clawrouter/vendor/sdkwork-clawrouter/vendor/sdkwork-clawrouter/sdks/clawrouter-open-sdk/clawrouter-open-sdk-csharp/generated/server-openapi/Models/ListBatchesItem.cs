using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class ListBatchesItem
    {
        public int? Created { get; set; }
        public int? CreatedAt { get; set; }
        public string? Endpoint { get; set; }
        public string? ErrorFileId { get; set; }
        public string? Id { get; set; }
        public string? InputFileId { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Object { get; set; }
        public string? OutputFileId { get; set; }
        public string? Status { get; set; }
    }
}
