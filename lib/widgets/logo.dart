import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

class UHmanaLogo extends StatelessWidget {
  final double size;
  final bool showWordmark;
  const UHmanaLogo({super.key, this.size = 80, this.showWordmark = true});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.favorite_rounded,
            size: size, color: AppColors.primary),
        if (showWordmark) ...[
          const SizedBox(height: 12),
          RichText(
            text: TextSpan(
              style: Theme.of(context).textTheme.displayMedium?.copyWith(
                    color: AppColors.ink,
                    fontSize: size * 0.45,
                  ),
              children: const [
                TextSpan(text: 'u'),
                TextSpan(
                    text: 'H',
                    style: TextStyle(color: AppColors.primary)),
                TextSpan(text: 'mana'),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
