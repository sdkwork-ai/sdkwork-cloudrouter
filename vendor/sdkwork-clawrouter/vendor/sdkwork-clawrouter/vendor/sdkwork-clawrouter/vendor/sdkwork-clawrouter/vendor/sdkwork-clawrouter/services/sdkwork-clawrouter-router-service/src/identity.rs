pub fn product_name() -> &'static str {
    "sdkwork-clawrouter"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn product_name_is_stable() {
        assert_eq!("sdkwork-clawrouter", product_name());
    }
}
