using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAuthWechatSettings
    {
        public List<AdminAuthWechatMini> Mini { get; set; }
        public List<AdminAuthWechatOfficial> Official { get; set; }
    }
}
