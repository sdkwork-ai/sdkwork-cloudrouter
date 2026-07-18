using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleFunctionDeclaration
    {
        public string? Description { get; set; }
        public string Name { get; set; }
        public GoogleSchema? Parameters { get; set; }
        public GoogleSchema? Response { get; set; }
    }
}
