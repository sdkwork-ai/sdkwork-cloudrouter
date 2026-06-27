using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class DashboardAnnouncement
    {
        public string Id { get; set; }
        public string Text { get; set; }
        public string Time { get; set; }
        public string Type { get; set; }
    }
}
