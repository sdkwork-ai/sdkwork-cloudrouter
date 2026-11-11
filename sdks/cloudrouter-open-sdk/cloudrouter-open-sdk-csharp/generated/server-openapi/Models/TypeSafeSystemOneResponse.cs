using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class TypeSafeSystemOneResponse
    {
        public Dictionary<string, TypeSafeAnswer> Answers { get; set; }
        public string? Model { get; set; }
        public TypeSafeUsage? Usage { get; set; }
    }
}
