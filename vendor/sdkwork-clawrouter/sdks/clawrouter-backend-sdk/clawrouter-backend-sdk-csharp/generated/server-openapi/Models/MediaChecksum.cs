using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MediaChecksum
    {
        public string Algorithm { get; set; }
        public string Value { get; set; }
    }
}
