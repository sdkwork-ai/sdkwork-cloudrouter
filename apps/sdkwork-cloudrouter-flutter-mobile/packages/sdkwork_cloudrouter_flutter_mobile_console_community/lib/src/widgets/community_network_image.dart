import 'package:flutter/material.dart';

import '../community_repository.dart';

/// Renders a community media reference after resolving `drive://` through the
/// host Drive port. While resolving, and on failure, it renders a neutral
/// placeholder instead of a broken image.
class CommunityNetworkImage extends StatelessWidget {
  const CommunityNetworkImage({
    required this.repository,
    required this.uri,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
    super.key,
  });

  final CommunityRepository repository;
  final String uri;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      width: width,
      height: height,
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Icon(
        Icons.image_outlined,
        size: (width ?? height ?? 48) * 0.35,
        color: Theme.of(context).colorScheme.outline,
      ),
    );
    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.zero,
      child: FutureBuilder<String?>(
        future: repository.resolveMediaUrl(uri),
        builder: (context, snapshot) {
          final url = snapshot.data;
          if (url == null || url.isEmpty) return placeholder;
          return Image.network(
            url,
            width: width,
            height: height,
            fit: fit,
            errorBuilder: (_, __, ___) => placeholder,
          );
        },
      ),
    );
  }
}
