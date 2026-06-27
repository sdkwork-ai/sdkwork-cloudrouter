use std::sync::OnceLock;
use std::time::Duration;

use sdkwork_id_core::{SnowflakeIdError, SnowflakeIdGenerator};
use sdkwork_utils_rust::uuid;

const DEFAULT_MCP_SNOWFLAKE_NODE_ID: u16 = 3;

static MCP_SNOWFLAKE_GENERATOR: OnceLock<SnowflakeIdGenerator> = OnceLock::new();

fn mcp_snowflake_generator() -> &'static SnowflakeIdGenerator {
    MCP_SNOWFLAKE_GENERATOR.get_or_init(|| {
        SnowflakeIdGenerator::new(resolve_mcp_snowflake_node_id())
            .expect("MCP snowflake node id must be valid")
    })
}

fn resolve_mcp_snowflake_node_id() -> u16 {
    std::env::var("SDKWORK_MCP_SNOWFLAKE_NODE_ID")
        .ok()
        .and_then(|value| value.trim().parse::<u16>().ok())
        .filter(|value| *value <= sdkwork_id_core::max_snowflake_node_id())
        .unwrap_or(DEFAULT_MCP_SNOWFLAKE_NODE_ID)
}

pub fn new_mcp_snowflake_id() -> u64 {
    loop {
        match mcp_snowflake_generator().generate() {
            Ok(id) if id > 0 => return id as u64,
            Ok(_) => continue,
            Err(SnowflakeIdError::SequenceExhausted { .. }) => {
                std::thread::sleep(Duration::from_millis(1));
            }
            Err(error) => panic!("generate MCP snowflake id failed: {error:?}"),
        }
    }
}

pub fn new_mcp_uuid() -> String {
    uuid()
}
