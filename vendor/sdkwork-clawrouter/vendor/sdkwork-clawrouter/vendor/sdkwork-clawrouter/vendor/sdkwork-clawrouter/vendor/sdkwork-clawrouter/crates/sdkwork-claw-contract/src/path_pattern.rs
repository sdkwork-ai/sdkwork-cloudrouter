pub fn matches_path_pattern(pattern: &str, path: &str) -> bool {
    let pattern_segments = split_path(pattern);
    let path_segments = split_path(path);

    pattern_segments.len() == path_segments.len()
        && pattern_segments.iter().zip(path_segments.iter()).all(
            |(pattern_segment, path_segment)| {
                is_path_parameter(pattern_segment) || pattern_segment == path_segment
            },
        )
}

fn split_path(path: &str) -> Vec<&str> {
    path.trim_matches('/')
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect()
}

fn is_path_parameter(segment: &str) -> bool {
    segment.len() > 2 && segment.starts_with('{') && segment.ends_with('}')
}
