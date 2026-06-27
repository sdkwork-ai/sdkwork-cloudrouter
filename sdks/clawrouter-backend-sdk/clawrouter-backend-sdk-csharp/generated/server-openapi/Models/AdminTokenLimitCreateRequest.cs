using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminTokenLimitCreateRequest
    {
        public int Burst { get; set; }
        public string KeyPrefix { get; set; }
        public int Rpd { get; set; }
        public int Rps { get; set; }
        public string? Status { get; set; }
        public string User { get; set; }
    }
}
