using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Backend.Models
{
    public class FieldError
    {
        public int? Code { get; set; }
        public string Field { get; set; }
        public string Message { get; set; }
    }
}
