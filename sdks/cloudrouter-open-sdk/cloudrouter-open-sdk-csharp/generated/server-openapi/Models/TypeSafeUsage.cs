using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class TypeSafeUsage
    {
        public int? InputTokens { get; set; }
        public int? OutputTokens { get; set; }
    }
}
