using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleCitationSource
    {
        public int? EndIndex { get; set; }
        public string? License { get; set; }
        public int? StartIndex { get; set; }
        public string? Uri { get; set; }
    }
}
