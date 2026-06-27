using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAuthWechatMini
    {
        public string AppId { get; set; }
        public bool Enabled { get; set; }
        public string Env { get; set; }
        public string Key { get; set; }
        public string Name { get; set; }
        public string Path { get; set; }
        public bool Primary { get; set; }
        public string SecretRef { get; set; }
        public string? Url { get; set; }
    }
}
