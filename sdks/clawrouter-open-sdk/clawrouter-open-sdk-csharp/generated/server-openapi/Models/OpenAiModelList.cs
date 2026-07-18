using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiModelList
    {
        public List<OpenAiModel> Data { get; set; }
        public string Object { get; set; }
    }
}
