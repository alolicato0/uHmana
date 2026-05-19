import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _pwdCtrl = TextEditingController();
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Bentornato!',
                  style: Theme.of(context).textTheme.displaySmall),
              const SizedBox(height: 4),
              const Text('Accedi al tuo account',
                  style: TextStyle(color: AppColors.muted)),
              const SizedBox(height: 32),
              OutlinedButton.icon(
                onPressed: _onSocial,
                icon: const Icon(Icons.g_mobiledata, size: 28),
                label: const Text('Continua con Google'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadii.md),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _onSocial,
                icon: const Icon(Icons.apple, size: 24),
                label: const Text('Continua con Apple'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadii.md),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Row(children: [
                Expanded(child: Divider()),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Text('oppure', style: TextStyle(color: AppColors.muted)),
                ),
                Expanded(child: Divider()),
              ]),
              const SizedBox(height: 16),
              TextField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  hintText: 'Inserisci la tua email',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _pwdCtrl,
                obscureText: _obscure,
                decoration: InputDecoration(
                  labelText: 'Password',
                  hintText: 'Inserisci la password',
                  suffixIcon: IconButton(
                    icon: Icon(_obscure
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {},
                  child: const Text('Password dimenticata?'),
                ),
              ),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => context.go('/home'),
                child: const Text('Accedi'),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Non hai un account? ',
                      style: TextStyle(color: AppColors.muted)),
                  TextButton(
                    onPressed: () => context.go('/home'),
                    child: const Text('Registrati'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _onSocial() {
    // TODO: integrare Firebase Auth (Google / Apple)
    context.go('/home');
  }
}
