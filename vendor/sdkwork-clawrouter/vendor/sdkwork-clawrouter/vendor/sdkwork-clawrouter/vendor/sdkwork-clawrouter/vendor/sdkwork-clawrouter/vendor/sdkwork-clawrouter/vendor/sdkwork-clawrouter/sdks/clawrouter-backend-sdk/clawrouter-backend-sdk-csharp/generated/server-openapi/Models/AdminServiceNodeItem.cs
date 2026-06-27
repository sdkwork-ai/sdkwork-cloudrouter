using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminServiceNodeItem
    {
        public string Domain { get; set; }
        public string HealthStatus { get; set; }
        public string Id { get; set; }
        public string Ip { get; set; }
        public string Name { get; set; }
        public string Remark { get; set; }
        public string Status { get; set; }
        public string UpdatedAt { get; set; }
    }
}
