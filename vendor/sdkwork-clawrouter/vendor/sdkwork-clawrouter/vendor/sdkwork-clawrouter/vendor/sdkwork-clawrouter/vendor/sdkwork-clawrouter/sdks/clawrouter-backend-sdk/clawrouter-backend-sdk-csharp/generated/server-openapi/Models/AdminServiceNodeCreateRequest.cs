using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminServiceNodeCreateRequest
    {
        public string Domain { get; set; }
        public string Ip { get; set; }
        public string Name { get; set; }
        public string? Remark { get; set; }
        public string? Status { get; set; }
    }
}
