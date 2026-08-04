pub fn product_name() -> &'static str {
    "sdkwork-cloudrouter"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn product_name_is_stable() {
        assert_eq!("sdkwork-cloudrouter", product_name());
    }
}
