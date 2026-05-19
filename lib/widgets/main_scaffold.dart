import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_theme.dart';

class MainScaffold extends StatelessWidget {
  final Widget child;
  final String location;
  const MainScaffold({super.key, required this.child, required this.location});

  int get _index {
    if (location.startsWith('/home')) return 0;
    if (location.startsWith('/timeline')) return 1;
    if (location.startsWith('/chat')) return 2;
    if (location.startsWith('/profile')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.3),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: FloatingActionButton(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          onPressed: () => context.push('/timeline/add'),
          child: const Icon(Icons.add, size: 28),
        ),
      ),
      bottomNavigationBar: BottomAppBar(
        color: Colors.white,
        elevation: 8,
        shape: const CircularNotchedRectangle(),
        notchMargin: 8,
        child: SizedBox(
          height: 56,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavItem(
                icon: Icons.home_rounded,
                label: 'Home',
                active: _index == 0,
                onTap: () => context.go('/home'),
              ),
              _NavItem(
                icon: Icons.timeline_rounded,
                label: 'Timeline',
                active: _index == 1,
                onTap: () => context.go('/timeline'),
              ),
              const SizedBox(width: 56),
              _NavItem(
                icon: Icons.chat_bubble_outline_rounded,
                label: 'Chat',
                active: _index == 2,
                onTap: () => context.go('/chat'),
              ),
              _NavItem(
                icon: Icons.person_outline_rounded,
                label: 'Profilo',
                active: _index == 3,
                onTap: () => context.go('/profile'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _NavItem({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.primary : AppColors.muted;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(
                    color: color, fontSize: 11, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}
