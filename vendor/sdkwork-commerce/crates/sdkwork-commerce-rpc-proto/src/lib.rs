pub const FILE_DESCRIPTOR_SET: &[u8] =
    include_bytes!(concat!(env!("OUT_DIR"), "/commerce_rpc_descriptor.bin"));

pub mod sdkwork {
    pub mod common {
        pub mod v1 {
            tonic::include_proto!("sdkwork.common.v1");
        }
    }

    pub mod commerce {
        pub mod app {
            pub mod v3 {
                tonic::include_proto!("sdkwork.commerce.app.v3");
            }
        }
        pub mod backend {
            pub mod v3 {
                tonic::include_proto!("sdkwork.commerce.backend.v3");
            }
        }
    }
}
