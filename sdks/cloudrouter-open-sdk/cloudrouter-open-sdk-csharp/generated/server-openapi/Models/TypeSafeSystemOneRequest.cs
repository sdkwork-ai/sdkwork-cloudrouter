using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class TypeSafeSystemOneRequest
    {
        public string? Model { get; set; }
        public Dictionary<string, TypeSafeQuestion> Questions { get; set; }
        public string State { get; set; }
    }
}
