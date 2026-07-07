using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class PageInfo
    {
        public bool? HasMore { get; set; }
        public string Mode { get; set; }
        public string? NextCursor { get; set; }
        public int? Page { get; set; }
        public int? PageSize { get; set; }
        public string? TotalItems { get; set; }
        public int? TotalPages { get; set; }
    }
}
