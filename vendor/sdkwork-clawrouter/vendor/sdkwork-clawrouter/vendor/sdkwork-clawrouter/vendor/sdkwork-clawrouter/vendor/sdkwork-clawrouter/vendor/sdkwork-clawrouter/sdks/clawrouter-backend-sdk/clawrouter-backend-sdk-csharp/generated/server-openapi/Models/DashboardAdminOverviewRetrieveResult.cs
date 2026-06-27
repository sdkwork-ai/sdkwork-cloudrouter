using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class DashboardAdminOverviewRetrieveResult
    {
        public string Code { get; set; }
        public AdminDashboardDataResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
