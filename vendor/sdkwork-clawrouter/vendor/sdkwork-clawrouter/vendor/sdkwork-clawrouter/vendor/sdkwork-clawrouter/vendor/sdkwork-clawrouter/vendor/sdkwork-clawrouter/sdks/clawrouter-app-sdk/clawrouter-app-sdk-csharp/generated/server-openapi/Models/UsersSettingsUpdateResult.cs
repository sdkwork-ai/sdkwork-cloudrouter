using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class UsersSettingsUpdateResult
    {
        public string Code { get; set; }
        public UpdateSettingsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
