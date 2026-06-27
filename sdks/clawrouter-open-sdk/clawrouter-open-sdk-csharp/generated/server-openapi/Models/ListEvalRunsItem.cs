using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class ListEvalRunsItem
    {
        public int? Created { get; set; }
        public int? CreatedAt { get; set; }
        public string? DataSource { get; set; }
        public string? Id { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Name { get; set; }
        public string? Object { get; set; }
        public string? ResultCounts { get; set; }
        public string? Status { get; set; }
    }
}
