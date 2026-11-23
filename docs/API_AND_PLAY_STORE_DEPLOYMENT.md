# Axumite AI Multilingual Translator — API & Google Play Store Deployment Guide

## 1. Backend API Reference (Port 3000)

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `POST` | `/api/obelisk/translate` | Neural text translation with Ge'ez Fidel breakdown & phonetic transliteration |
| `POST` | `/api/obelisk/voice-translate` | Real-time speech-to-text, auto language detection & conversational translation |
| `POST` | `/api/obelisk/tts` | Multilingual voice synthesis (supports `Kore`, `Aoede`, `Fenrir`, `Charon`) |
| `POST` | `/api/obelisk/ocr` | Raw text extraction from uploaded images & screenshots |
| `POST` | `/api/obelisk/ocr-structured` | Auto-detect OCR extraction, full translation & bounding-box overlays (`xPct`, `yPct`, `wPct`, `hPct`) |
| `POST` | `/api/obelisk/pronunciation-check` | Spoken audio transcription + pronunciation accuracy score (`0-100`) & articulation tips |
| `GET` | `/api/obelisk/offline-packs` | List downloadable offline lexicon pack metadata |
| `GET` | `/api/obelisk/offline-pack/:langCode` | Download complete bilingual offline dictionary pack for IndexedDB storage |
| `GET` | `/api/docs` | Machine-readable API endpoint catalog |
| `WS` | `/ws/call-signaling` | Room-isolated encrypted WebRTC offer/answer/ICE & live translated subtitle relay |
| `GET` | `/api/payments/plans` | Free, Pro, and Premium multi-currency plans (`USD`, `EUR`, `GBP`, `ERN`, `ETB`, etc.) |
| `POST` | `/api/payment/create-checkout-session` | Stripe-tokenized checkout initiation (zero PAN/CVV storage) |

---

## 2. Language Coverage Transparency

- **Full Neural Coverage**: English, German, Amharic, Tigrinya, Arabic, French, Spanish, Italian, Chinese (Simplified), Portuguese
- **Community-Validated Glossary + AI Assisted Mode**: Kunama, Irob, Ge'ez, Bilen, Tigre, Afar, Saho
- Modes that rely on community-curated phonetic guidance clearly indicate `Community-Validated` badges rather than claiming native TTS synthesis.

---

## 3. Android APK / AAB Release Build Instructions

The Android companion module in `/android` targets **SDK 35** (`minSdk = 26`) with CameraX (`1.4+`), Google ML Kit Text Recognition (`16.0.1`), explicit `MediaProjection` consent, and R8 resource shrinking enabled.

### Generate Signed Release Android App Bundle (.aab)
1. Configure a release keystore in `android/keystore.properties` (excluded from Git):
   ```properties
   storeFile=axumite-release.jks
   storePassword=YOUR_STORE_PASSWORD
   keyAlias=axumite_key
   keyPassword=YOUR_KEY_PASSWORD
   ```
2. Build the signed Play Store AAB:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   Output: `android/app/build/outputs/bundle/release/app-release.aab`
3. Build a sideloadable APK for device QA testing:
   ```bash
   ./gradlew assembleRelease
   ```

---

## 4. Google Play Store Submission Checklist

- **Permissions Declarations** (`AndroidManifest.xml`):
  - `CAMERA`: Used strictly for interactive Camera OCR document/menu/sign scanning (`CameraXOCRAnalyzer`).
  - `RECORD_AUDIO` & `MODIFY_AUDIO_SETTINGS`: Used for Conversation Mode, AI Voice Translator, Pronunciation Practice, and active WebRTC calls.
  - `FOREGROUND_SERVICE_MEDIA_PROJECTION`: Declared with foreground notification (`ScreenCaptureForegroundService`) and requires interactive `MediaProjectionManager.createScreenCaptureIntent()` user approval per capture. Never captures screens silently.
- **Play Console Data Safety Form**:
  - Account email & translated history stored in user-owned Firebase Firestore collections (`users/{uid}/...`).
  - Users can export JSON or permanently erase all cloud/offline records directly inside **Translator -> Privacy -> Delete All My Translator Data**.
  - Payment cards are never stored in Firestore or SQL databases; tokenization runs via Stripe / Google Play Billing.
- **In-App Calls Disclosure**:
  - Live Call Translation uses encrypted in-app WebRTC rooms (`DTLS-SRTP`) and does not intercept carrier/cellular PSTN calls.
