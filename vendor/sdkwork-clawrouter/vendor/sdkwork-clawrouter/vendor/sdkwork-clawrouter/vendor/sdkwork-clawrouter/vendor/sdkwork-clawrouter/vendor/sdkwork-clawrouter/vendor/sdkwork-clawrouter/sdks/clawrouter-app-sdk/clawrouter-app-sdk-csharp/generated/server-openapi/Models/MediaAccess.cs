using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class MediaAccess
    {
        public string? ExpiresAt { get; set; }
        public string Visibility { get; set; }
    }
}
