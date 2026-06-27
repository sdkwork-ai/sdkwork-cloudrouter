using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class DashboardRetrieveResult
    {
        public string Code { get; set; }
        public ServiceProviderDashboardResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
