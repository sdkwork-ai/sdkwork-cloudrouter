using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAuthSettingsUpdateRequest
    {
        public string? LeftRailMode { get; set; }
        public List<string>? LoginMethods { get; set; }
        public bool? OauthLoginEnabled { get; set; }
        public List<string>? OauthProviders { get; set; }
        public string? OauthRegion { get; set; }
        public bool? QrLoginEnabled { get; set; }
        public string? QrLoginType { get; set; }
        public List<string>? RecoveryMethods { get; set; }
        public List<string>? RegisterMethods { get; set; }
        public AdminAuthVerificationPolicy? VerificationPolicy { get; set; }
        public AdminAuthWechatSettingsUpdate? Wechat { get; set; }
    }
}
