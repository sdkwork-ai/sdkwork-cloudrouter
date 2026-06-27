using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiModel
    {
        public int? Created { get; set; }
        public string? Id { get; set; }
        public string? Object { get; set; }
        public string? OwnedBy { get; set; }
    }
}
