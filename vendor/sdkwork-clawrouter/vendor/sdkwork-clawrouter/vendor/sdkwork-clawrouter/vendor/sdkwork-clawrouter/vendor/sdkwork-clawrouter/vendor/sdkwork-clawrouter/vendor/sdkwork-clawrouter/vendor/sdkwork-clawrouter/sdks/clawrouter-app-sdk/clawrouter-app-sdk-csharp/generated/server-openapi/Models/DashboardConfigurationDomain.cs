using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class DashboardConfigurationDomain
    {
        public string Domain { get; set; }
        public string Id { get; set; }
        public string Ip { get; set; }
        public string Name { get; set; }
        public string Remark { get; set; }
        public string Status { get; set; }
    }
}
