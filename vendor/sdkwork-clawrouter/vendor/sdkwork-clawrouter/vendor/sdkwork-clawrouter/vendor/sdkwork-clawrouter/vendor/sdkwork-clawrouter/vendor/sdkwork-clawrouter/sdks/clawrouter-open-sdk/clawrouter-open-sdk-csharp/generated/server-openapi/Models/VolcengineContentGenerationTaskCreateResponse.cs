using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class VolcengineContentGenerationTaskCreateResponse
    {
        public string? CreatedAt { get; set; }
        public string? Id { get; set; }
        public string? Status { get; set; }
        public string? TaskId { get; set; }
    }
}
