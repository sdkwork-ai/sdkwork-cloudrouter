using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class RunwayTask
    {
        public string? CreatedAt { get; set; }
        public string? Failure { get; set; }
        public string? FailureCode { get; set; }
        public string? Id { get; set; }
        public List<string>? Output { get; set; }
        public double? Progress { get; set; }
        public string? Status { get; set; }
    }
}
