using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ProblemDetail
    {
        public string? Code { get; set; }
        public string? Detail { get; set; }
        public List<FieldError>? Errors { get; set; }
        public string? Instance { get; set; }
        public string? RequestId { get; set; }
        public int Status { get; set; }
        public string Title { get; set; }
        public string? TraceId { get; set; }
        public string Type { get; set; }
    }
}
