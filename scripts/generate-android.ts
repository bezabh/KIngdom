import { KOTLIN_ANDROID_PROJECT_FILES } from '../src/data/androidKotlinSourceCodeData';
import * as fs from 'fs';
import * as path from 'path';

const rootDir = path.resolve('android');

// Ensure android directory exists
fs.mkdirSync(rootDir, { recursive: true });

// Write root gradle files
fs.writeFileSync(path.join(rootDir, 'build.gradle.kts'), `plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.ksp) apply false
}
`);

fs.writeFileSync(path.join(rootDir, 'settings.gradle.kts'), `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "AxumiteAI"
include(":app")
`);

const gradleDir = path.join(rootDir, 'gradle');
fs.mkdirSync(gradleDir, { recursive: true });

fs.writeFileSync(path.join(gradleDir, 'libs.versions.toml'), `[versions]
agp = "8.5.2"
kotlin = "2.0.20"
coreKtx = "1.13.1"
lifecycleRuntimeKtx = "2.8.5"
activityCompose = "1.9.2"
composeBom = "2024.09.00"
navigationCompose = "2.8.0"
cameraX = "1.3.4"
room = "2.6.1"
ksp = "2.0.20-1.0.25"
okhttp = "4.12.0"
onesignal = "5.1.20"
coroutines = "1.8.1"
junit = "4.13.2"
mockk = "1.13.12"
androidxTestExt = "1.2.1"
androidxTestRunner = "1.6.2"
androidxTestRules = "1.6.1"
androidxTestCore = "1.6.1"
espresso = "3.6.1"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }
androidx-camera-core = { group = "androidx.camera", name = "camera-core", version.ref = "cameraX" }
androidx-camera-camera2 = { group = "androidx.camera", name = "camera-camera2", version.ref = "cameraX" }
androidx-camera-lifecycle = { group = "androidx.camera", name = "camera-lifecycle", version.ref = "cameraX" }
androidx-camera-view = { group = "androidx.camera", name = "camera-view", version.ref = "cameraX" }
androidx-room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
androidx-room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
androidx-room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
okhttp = { group = "com.squareup.okhttp3", name = "okhttp", version.ref = "okhttp" }
onesignal = { group = "com.onesignal", name = "OneSignal", version.ref = "onesignal" }
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }
junit = { group = "junit", name = "junit", version.ref = "junit" }
mockk = { group = "io.mockk", name = "mockk", version.ref = "mockk" }
mockk-android = { group = "io.mockk", name = "mockk-android", version.ref = "mockk" }
kotlinx-coroutines-test = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test", version.ref = "coroutines" }
androidx-test-ext-junit = { group = "androidx.test.ext", name = "junit", version.ref = "androidxTestExt" }
androidx-test-runner = { group = "androidx.test", name = "runner", version.ref = "androidxTestRunner" }
androidx-test-rules = { group = "androidx.test", name = "rules", version.ref = "androidxTestRules" }
androidx-test-core = { group = "androidx.test", name = "core", version.ref = "androidxTestCore" }
androidx-test-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espresso" }
androidx-test-espresso-intents = { group = "androidx.test.espresso", name = "espresso-intents", version.ref = "espresso" }
androidx-compose-ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
`);

const wrapperDir = path.join(gradleDir, 'wrapper');
fs.mkdirSync(wrapperDir, { recursive: true });
fs.writeFileSync(path.join(wrapperDir, 'gradle-wrapper.properties'), `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`);

fs.writeFileSync(path.join(rootDir, 'gradle.properties'), `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
kotlin.code.style=official
`);

// Write all Kotlin and Android files
for (const file of KOTLIN_ANDROID_PROJECT_FILES) {
  const filePath = path.join(rootDir, file.path);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, file.content);
}

// Write Android Studio instructions
fs.writeFileSync(path.join(rootDir, 'README.md'), `# Axumite AI - Native Android Application (Kotlin & Android SDK)

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
2. Select **Open** and select this \`android/\` directory.
3. Allow Gradle to sync dependencies automatically.
4. Select your connected Android device or emulator and press **Run** (Shift+F10).
5. To build release APK or AAB: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
`);

console.log('Successfully generated complete native Kotlin Android app in ./android/');
