using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class DeleteResult
    {
        public bool? Deleted { get; set; }
        public string? Id { get; set; }
        public string? Object { get; set; }
    }
}
