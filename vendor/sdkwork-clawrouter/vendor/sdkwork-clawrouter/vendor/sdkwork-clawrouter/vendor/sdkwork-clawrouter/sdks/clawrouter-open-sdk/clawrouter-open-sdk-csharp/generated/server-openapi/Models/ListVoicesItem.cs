using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class ListVoicesItem
    {
        public int? Created { get; set; }
        public int? CreatedAt { get; set; }
        public string? Id { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Object { get; set; }
        public string? Status { get; set; }
        public string? Text { get; set; }
        public string? Url { get; set; }
        public string? Voice { get; set; }
    }
}
