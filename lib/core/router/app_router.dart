import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/login_screen.dart';
import '../../features/chat/chat_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/emergency/emergency_screen.dart';
import '../../features/image_analysis/image_analysis_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/profile/medical_record_screen.dart';
import '../../features/reminders/reminders_screen.dart';
import '../../features/reports/reports_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/timeline/timeline_screen.dart';
import '../../features/timeline/add_event_screen.dart';
import '../../features/welcome/welcome_screen.dart';
import '../../widgets/main_scaffold.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/welcome', builder: (_, __) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(
        path: '/emergency',
        builder: (_, __) => const EmergencyScreen(),
      ),
      GoRoute(
        path: '/image-analysis',
        builder: (_, __) => const ImageAnalysisScreen(),
      ),
      GoRoute(
        path: '/medical-record',
        builder: (_, __) => const MedicalRecordScreen(),
      ),
      GoRoute(
        path: '/reports',
        builder: (_, __) => const ReportsScreen(),
      ),
      GoRoute(
        path: '/reminders',
        builder: (_, __) => const RemindersScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (_, __) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/timeline/add',
        builder: (_, __) => const AddEventScreen(),
      ),
      ShellRoute(
        builder: (ctx, state, child) =>
            MainScaffold(location: state.uri.path, child: child),
        routes: [
          GoRoute(path: '/home', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/timeline', builder: (_, __) => const TimelineScreen()),
          GoRoute(path: '/chat', builder: (_, __) => const ChatScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),
    ],
  );
});
