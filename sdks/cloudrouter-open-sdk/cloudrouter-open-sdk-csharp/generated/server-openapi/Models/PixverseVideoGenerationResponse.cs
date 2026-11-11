using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class PixverseVideoGenerationResponse
    {
        public int? ErrCode { get; set; }
        public string? ErrMsg { get; set; }
        public PixverseErrorDetail? Error { get; set; }
        public PixverseTaskResp? Resp { get; set; }
    }
}
