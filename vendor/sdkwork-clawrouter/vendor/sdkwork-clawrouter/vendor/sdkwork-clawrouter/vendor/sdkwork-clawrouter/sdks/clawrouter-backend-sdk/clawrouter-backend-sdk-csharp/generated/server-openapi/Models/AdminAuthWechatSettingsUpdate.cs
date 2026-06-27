using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAuthWechatSettingsUpdate
    {
        public List<AdminAuthWechatMini>? Mini { get; set; }
        public List<AdminAuthWechatOfficial>? Official { get; set; }
    }
}
