using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class CreateStorageBucketRequest
    {
        public bool? BlockPublicAccess { get; set; }
        public string BucketName { get; set; }
        public string? BucketRegion { get; set; }
        public string? DataResidencyRegion { get; set; }
        public string? DefaultEncryptionMode { get; set; }
        public string? DefaultStorageClass { get; set; }
        public string? Encryption { get; set; }
        public string? KmsKeyRef { get; set; }
        public bool? LifecycleEnabled { get; set; }
        public string LogicalScope { get; set; }
        public string? ObjectKeyPrefix { get; set; }
        public bool? ObjectLockEnabled { get; set; }
        public string ProviderId { get; set; }
        public bool? PublicAccessBlocked { get; set; }
        public string? StorageClass { get; set; }
        public bool? VersioningEnabled { get; set; }
    }
}
