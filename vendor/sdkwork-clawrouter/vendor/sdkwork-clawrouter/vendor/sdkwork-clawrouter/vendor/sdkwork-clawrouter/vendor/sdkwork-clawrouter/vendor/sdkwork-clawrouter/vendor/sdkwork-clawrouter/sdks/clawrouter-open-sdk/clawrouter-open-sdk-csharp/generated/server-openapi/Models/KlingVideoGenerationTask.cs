using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class KlingVideoGenerationTask
    {
        public string? CreatedAt { get; set; }
        public ProviderTaskError? Error { get; set; }
        public string? Id { get; set; }
        public string? Model { get; set; }
        public string? Prompt { get; set; }
        public string? State { get; set; }
        public string? Status { get; set; }
        public string? TaskId { get; set; }
        public string? UpdatedAt { get; set; }
        public List<ProviderGeneratedMedia>? Videos { get; set; }
    }
}
