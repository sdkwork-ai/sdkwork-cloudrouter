using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class UpdateSettingsRequest
    {
        public string Language { get; set; }
        public SettingsNotifications Notifications { get; set; }
        public string Timezone { get; set; }
        public string WebhookUrl { get; set; }
    }
}
