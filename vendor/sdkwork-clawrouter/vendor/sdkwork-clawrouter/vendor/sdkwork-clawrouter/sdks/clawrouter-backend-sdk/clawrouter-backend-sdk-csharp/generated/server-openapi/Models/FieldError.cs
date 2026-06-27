using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class FieldError
    {
        public string? Code { get; set; }
        public string? Field { get; set; }
        public string? Message { get; set; }
    }
}
