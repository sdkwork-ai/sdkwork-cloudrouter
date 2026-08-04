use std::fmt;

use axum::http::{uri::PathAndQuery, Uri};
use url::form_urlencoded::{parse, Serializer};

const SENSITIVE_QUERY_PARAMETER_NAMES: [&str; 5] =
    ["key", "api_key", "apikey", "access_token", "token"];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct QueryStringError;

pub fn sanitize_sensitive_query(query: Option<&str>) -> Option<String> {
    let pairs = query
        .into_iter()
        .flat_map(|query| parse(query.as_bytes()))
        .filter(|(name, _)| !is_sensitive_query_parameter(name))
        .map(|(name, value)| (name.into_owned(), value.into_owned()));

    serialize_non_empty(pairs)
}

pub fn sanitize_sensitive_query_in_uri(uri: &Uri) -> Result<Uri, QueryStringError> {
    replace_uri_query(uri, sanitize_sensitive_query(uri.query()).as_deref())
}

pub fn upsert_query_parameter(query: Option<&str>, name: &str, value: &str) -> String {
    let retained = query
        .into_iter()
        .flat_map(|query| parse(query.as_bytes()))
        .filter(|(candidate, _)| candidate.as_ref() != name)
        .map(|(name, value)| (name.into_owned(), value.into_owned()));
    let mut serializer = Serializer::new(String::new());
    serializer.extend_pairs(retained);
    serializer.append_pair(name, value);
    serializer.finish()
}

pub(crate) fn exact_query_parameter_values(query: Option<&str>, name: &str) -> Vec<String> {
    query
        .into_iter()
        .flat_map(|query| parse(query.as_bytes()))
        .filter(|(candidate, _)| candidate.as_ref() == name)
        .map(|(_, value)| value.into_owned())
        .collect()
}

fn is_sensitive_query_parameter(name: &str) -> bool {
    let normalized = name.trim().to_ascii_lowercase();
    SENSITIVE_QUERY_PARAMETER_NAMES.contains(&normalized.as_str())
}

fn serialize_non_empty(pairs: impl IntoIterator<Item = (String, String)>) -> Option<String> {
    let mut serializer = Serializer::new(String::new());
    serializer.extend_pairs(pairs);
    let query = serializer.finish();
    (!query.is_empty()).then_some(query)
}

fn replace_uri_query(uri: &Uri, query: Option<&str>) -> Result<Uri, QueryStringError> {
    let path_and_query = match query {
        Some(query) => format!("{}?{query}", uri.path()),
        None => uri.path().to_owned(),
    }
    .parse::<PathAndQuery>()
    .map_err(|_| QueryStringError)?;
    let mut parts = uri.clone().into_parts();
    parts.path_and_query = Some(path_and_query);
    Uri::from_parts(parts).map_err(|_| QueryStringError)
}

impl fmt::Display for QueryStringError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("failed to rebuild URI after query sanitization")
    }
}

impl std::error::Error for QueryStringError {}
