import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app/uhmana_app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await dotenv.load(fileName: '.env');
  await Hive.initFlutter();
  await initializeDateFormatting('it', null);

  // Firebase init è opzionale in dev: se non hai ancora configurato
  // google-services.json / GoogleService-Info.plist, commenta queste righe.
  // await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  // await MobileAds.instance.initialize();

  runApp(const ProviderScope(child: UHmanaApp()));
}
