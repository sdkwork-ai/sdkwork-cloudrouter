using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMcpServerRevisionCreateRequest
    {
        public List<string>? ArgsJson { get; set; }
        public string? AuthType { get; set; }
        public string? Command { get; set; }
        public string? EndpointUrl { get; set; }
        public Dictionary<string, string>? EnvSchema { get; set; }
        public Dictionary<string, string>? RetryPolicy { get; set; }
        public string RevisionNo { get; set; }
        public string? SecretRef { get; set; }
        public int? TimeoutMs { get; set; }
        public string? Transport { get; set; }
    }
}
