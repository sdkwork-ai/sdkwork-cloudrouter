using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class SettingsNotifications
    {
        public bool ApiMonitor { get; set; }
        public bool BillReminder { get; set; }
        public bool QuotaWarning { get; set; }
    }
}
