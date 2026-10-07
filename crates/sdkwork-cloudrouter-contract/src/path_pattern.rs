pub fn matches_path_pattern(pattern: &str, path: &str) -> bool {
    let pattern_segments = split_path(pattern);
    let path_segments = split_path(path);

    pattern_segments.len() == path_segments.len()
        && pattern_segments.iter().zip(path_segments.iter()).all(
            |(pattern_segment, path_segment)| {
                matches_path_segment(pattern_segment, path_segment)
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

/// Matches one pattern segment against one request segment.
///
/// A full-segment `{param}` matches any non-empty value. A mixed segment — a
/// literal with exactly one `{param}` span inside it, such as the Gemini
/// action suffix `{model}:generateImages` — matches when the value carries the
/// same literal prefix/suffix and leaves the placeholder non-empty. Segments
/// with more than one placeholder span stay literal: no contract path uses
/// that shape, and keeping them literal means the semantics never loosen
/// silently.
fn matches_path_segment(pattern_segment: &str, path_segment: &str) -> bool {
    if is_path_parameter(pattern_segment) {
        return !path_segment.is_empty();
    }
    let Some(brace_start) = pattern_segment.find('{') else {
        return pattern_segment == path_segment;
    };
    let Some(brace_rel) = pattern_segment[brace_start..].find('}') else {
        return pattern_segment == path_segment;
    };
    let brace_end = brace_start + brace_rel;
    let prefix = &pattern_segment[..brace_start];
    let suffix = &pattern_segment[brace_end + 1..];
    if suffix.contains('{') {
        return pattern_segment == path_segment;
    }
    path_segment.len() > prefix.len() + suffix.len()
        && path_segment.starts_with(prefix)
        && path_segment.ends_with(suffix)
}

#[cfg(test)]
mod tests {
    use super::matches_path_pattern;

    #[test]
    fn full_segment_parameters_keep_matching_any_value() {
        assert!(matches_path_pattern(
            "/v1/models/{model}",
            "/v1/models/gpt-image-2"
        ));
        assert!(!matches_path_pattern(
            "/v1/models/{model}",
            "/v1/models/gpt-image-2/extra"
        ));
    }

    #[test]
    fn mixed_literal_placeholder_segments_match_action_suffixes() {
        // Gemini mounts its action suffix inside the model segment; the suffix
        // must be required and the placeholder must stay non-empty.
        assert!(matches_path_pattern(
            "/google/v1beta/models/{model}:generateImages",
            "/google/v1beta/models/gemini-3-pro-image:generateImages"
        ));
        assert!(!matches_path_pattern(
            "/google/v1beta/models/{model}:generateImages",
            "/google/v1beta/models/gemini-3-pro-image:generateVideos"
        ));
        assert!(!matches_path_pattern(
            "/google/v1beta/models/{model}:generateImages",
            "/google/v1beta/models/:generateImages"
        ));
    }
}
