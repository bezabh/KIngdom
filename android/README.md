# Axumite AI - Native Android Application (Kotlin & Android SDK)

This directory contains the complete, production-ready native Android Studio project for Axumite AI, built with:

- **Kotlin 2.0+ & Jetpack Compose** Material 3 Edge-to-Edge Architecture
- **Target SDK 35 (Android 15)** & Min SDK 26
- **Biometric Security & StrongBox TEE Cryptography** via AndroidX BiometricPrompt
- **OneSignal SDK v5.x** Push Notification Engine
- **CameraX + Vision OCR** for Ge'ez manuscript & Tigrinya text recognition
- **Room Database** for offline Tigrinya lexicon storage
- **Kotlin Coroutines & Flow** reactive state architecture
- **Unit & Instrumented Espresso Tests**

## How to Open and Build in Android Studio

1. Open **Android Studio** (Koala, Ladybug, or newer).
2. Select **Open** and select this `android/` directory.
3. Allow Gradle to sync dependencies automatically.
4. Select your connected Android device or emulator and press **Run** (Shift+F10).
5. To build release APK or AAB: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
