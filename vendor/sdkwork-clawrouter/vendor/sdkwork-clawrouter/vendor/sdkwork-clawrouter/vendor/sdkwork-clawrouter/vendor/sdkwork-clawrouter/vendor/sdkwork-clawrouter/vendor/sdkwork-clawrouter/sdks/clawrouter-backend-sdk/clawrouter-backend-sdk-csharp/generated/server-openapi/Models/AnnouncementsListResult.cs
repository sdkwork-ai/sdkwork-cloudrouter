using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AnnouncementsListResult
    {
        public string Code { get; set; }
        public AdminAnnouncementsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
