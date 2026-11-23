package com.axumite.ai;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.ImageButton;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.card.MaterialCardView;
import com.onesignal.OneSignal;
import com.onesignal.debug.LogLevel;
import com.onesignal.Continue;
import java.util.concurrent.Executor;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    
    // SharedPreferences constants for Security & App Lock
    public static final String PREFS_NAME = "AxumitePrefs";
    public static final String KEY_APP_LOCK_ENABLED = "pref_app_lock_enabled";
    public static final String KEY_LOCK_TIMEOUT_MINUTES = "pref_lock_timeout_minutes";
    
    // OneSignal App ID (Configured for Axumite AI Push Notification Services)
    public static final String ONESIGNAL_APP_ID = "122b150b-1b50-4200-b515-7da4ed438c4e";

    private ImageButton btnLanguageToggle;
    private ImageButton btnQuickDiagnostics;
    private MaterialButton btnQuickVoiceChat;
    private MaterialCardView cardNavChat;
    private MaterialCardView cardNavOcr;
    private MaterialCardView cardNavTelebirr;
    private MaterialCardView cardNavDictionary;
    private MaterialCardView cardSystemStatus;

    private boolean isTigrinya = true;
    private boolean isAppUnlocked = false;

    private BiometricPrompt biometricPrompt;
    private BiometricPrompt.PromptInfo promptInfo;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        setupClickListeners();
        setupBiometricPrompt();

        // Initialize OneSignal Push Notification SDK in onCreate
        initOneSignalPush();

        // Check user preference for App Lock before granting access to main interface
        checkAppLockAndAuthenticate();
    }

    /**
     * Checks user App Lock preference in SharedPreferences.
     * If enabled, locks the interface and prompts for Biometric / PIN authentication.
     * If disabled, immediately unlocks and permits normal app access.
     */
    private void checkAppLockAndAuthenticate() {
        boolean appLockRequired = isAppLockEnabled();
        Log.i(TAG, "Checking App Lock preference on startup: " + (appLockRequired ? "ENABLED" : "DISABLED"));

        if (appLockRequired) {
            isAppUnlocked = false;
            Toast.makeText(this, isTigrinya ? "ናይ ኣፕ መዕጸዊ ንጡፍ እዩ (App Lock active)" : "App Lock is active. Verify identity.", Toast.LENGTH_SHORT).show();
            authenticateWithBiometrics();
        } else {
            isAppUnlocked = true;
            Log.i(TAG, "App Lock disabled by user preference. Proceeding directly to main interface.");
        }
    }

    /**
     * Helper to read App Lock status from SharedPreferences.
     */
    public boolean isAppLockEnabled() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        return prefs.getBoolean(KEY_APP_LOCK_ENABLED, false);
    }

    /**
     * Helper to update App Lock preference.
     */
    public void setAppLockEnabled(boolean enabled) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_APP_LOCK_ENABLED, enabled).apply();
        Log.i(TAG, "App Lock preference updated to: " + enabled);
    }

    /**
     * Initializes OneSignal Push Notification SDK in MainActivity.
     * Sets verbose debug logging (setLogLevel), initializes with Application Context and App ID,
     * requests Android 13+ notification permissions, and binds notification click listeners.
     */
    private void initOneSignalPush() {
        try {
            // Enable verbose OneSignal logging for debugging push notification delivery status during development
            OneSignal.getDebug().setLogLevel(LogLevel.VERBOSE);
            OneSignal.getDebug().setAlertLevel(LogLevel.NONE);
            Log.d(TAG, "OneSignal Debug Log Level configured to VERBOSE for push delivery tracking and development diagnostics.");

            // OneSignal Initialization with Context and App ID (SDK v5.x)
            OneSignal.initWithContext(this.getApplicationContext(), ONESIGNAL_APP_ID);

            // Request Notification Permission on Android 13+ (API 33+ POST_NOTIFICATIONS)
            OneSignal.getNotifications().requestPermission(true, Continue.with(r -> {
                if (r.isSuccess()) {
                    if (Boolean.TRUE.equals(r.getData())) {
                        Log.i(TAG, "OneSignal Notification permission granted by user.");
                    } else {
                        Log.w(TAG, "OneSignal Notification permission denied by user.");
                    }
                } else {
                    Log.e(TAG, "OneSignal permission request failed: " + r.getThrowable());
                }
            }));

            // Handle Push Notification click events and deep-link routing
            OneSignal.getNotifications().addClickListener(event -> {
                Log.i(TAG, "OneSignal Push Notification opened: " + event.getNotification().getTitle());
                String title = event.getNotification().getTitle();
                if (title != null) {
                    Toast.makeText(MainActivity.this, "Axumite Push: " + title, Toast.LENGTH_SHORT).show();
                }
            });

            Log.i(TAG, "OneSignal Push Notification SDK initialized successfully in MainActivity.");
        } catch (Exception e) {
            Log.e(TAG, "Error initializing OneSignal Push Notifications in MainActivity", e);
        }
    }

    /**
     * Initializes androidx.biometric.BiometricPrompt with custom callbacks
     * for handling authentication success, failures, and device credentials.
     */
    private void setupBiometricPrompt() {
        Executor executor = ContextCompat.getMainExecutor(this);

        biometricPrompt = new BiometricPrompt(MainActivity.this, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                super.onAuthenticationError(errorCode, errString);
                Log.w(TAG, "Biometric Auth Error (" + errorCode + "): " + errString);
                if (errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON || errorCode == BiometricPrompt.ERROR_USER_CANCELED) {
                    Toast.makeText(MainActivity.this, "Authentication cancelled. Biometric lock active.", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(MainActivity.this, "Biometric Error: " + errString, Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                super.onAuthenticationSucceeded(result);
                isAppUnlocked = true;
                Log.i(TAG, "Biometric Authentication Succeeded. Sovereign session unlocked.");
                String successMsg = isTigrinya ? "ባዮሜትሪክ ምርመራ ብዓወት ሓሊፉ • ሰላም መጻእኹም!" : "Biometric Verification Succeeded • Welcome to Axumite AI!";
                Toast.makeText(MainActivity.this, successMsg, Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onAuthenticationFailed() {
                super.onAuthenticationFailed();
                Log.w(TAG, "Biometric Authentication failed - unrecognized biometric sample.");
                String failMsg = isTigrinya ? "ባዮሜትሪክ ኣይተለለየን፡ ደጊምኩም ፈትኑ" : "Biometric not recognized. Please try again.";
                Toast.makeText(MainActivity.this, failMsg, Toast.LENGTH_SHORT).show();
            }
        });

        promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Axumite AI • ባዮሜትሪክ መቆጻጸሪ")
                .setSubtitle("Fingerprint or Face Authentication Required")
                .setDescription("Secure Sovereign Ge'ez manuscript models, offline database, and Telebirr wallet on startup.")
                .setNegativeButtonText("Use PIN / Cancel")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK)
                .build();
    }

    /**
     * Checks device biometric capabilities and prompts for authentication if available.
     */
    public void authenticateWithBiometrics() {
        BiometricManager biometricManager = BiometricManager.from(this);
        int canAuthenticate = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK);

        switch (canAuthenticate) {
            case BiometricManager.BIOMETRIC_SUCCESS:
                Log.i(TAG, "Device supports biometrics and credentials enrolled. Launching BiometricPrompt.");
                biometricPrompt.authenticate(promptInfo);
                break;
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                Log.w(TAG, "No biometric features available on this device.");
                isAppUnlocked = true;
                break;
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                Log.w(TAG, "Biometric hardware currently unavailable.");
                isAppUnlocked = true;
                break;
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                Log.w(TAG, "No biometrics enrolled. Prompting user to configure in device settings.");
                Toast.makeText(this, "No biometrics registered on device. Please register fingerprint or face.", Toast.LENGTH_LONG).show();
                isAppUnlocked = true;
                break;
            default:
                isAppUnlocked = true;
                break;
        }
    }

    private void initViews() {
        btnLanguageToggle = findViewById(R.id.btnLanguageToggle);
        btnQuickDiagnostics = findViewById(R.id.btnQuickDiagnostics);
        btnQuickVoiceChat = findViewById(R.id.btnQuickVoiceChat);
        cardNavChat = findViewById(R.id.cardNavChat);
        cardNavOcr = findViewById(R.id.cardNavOcr);
        cardNavTelebirr = findViewById(R.id.cardNavTelebirr);
        cardNavDictionary = findViewById(R.id.cardNavDictionary);
        cardSystemStatus = findViewById(R.id.cardSystemStatus);
    }

    private void setupClickListeners() {
        btnLanguageToggle.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                isTigrinya = !isTigrinya;
                String msg = isTigrinya ? "ቋንቋ ናብ ትግርኛ ተቐይሩ ኣሎ" : "Language switched to English";
                Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
            }
        });

        btnQuickDiagnostics.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isAppLockEnabled() && !isAppUnlocked) {
                    authenticateWithBiometrics();
                    return;
                }
                startActivity(new Intent(MainActivity.this, SystemDiagnosticsActivity.class));
            }
        });

        btnQuickVoiceChat.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isAppLockEnabled() && !isAppUnlocked) {
                    authenticateWithBiometrics();
                    return;
                }
                Intent intent = new Intent(MainActivity.this, ObeliskChatActivity.class);
                intent.putExtra("auto_start_voice", true);
                startActivity(intent);
            }
        });

        cardNavChat.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isAppLockEnabled() && !isAppUnlocked) {
                    authenticateWithBiometrics();
                    return;
                }
                startActivity(new Intent(MainActivity.this, ObeliskChatActivity.class));
            }
        });

        cardNavOcr.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isAppLockEnabled() && !isAppUnlocked) {
                    authenticateWithBiometrics();
                    return;
                }
                startActivity(new Intent(MainActivity.this, GeezCameraOcrActivity.class));
            }
        });

        cardNavTelebirr.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isAppLockEnabled() && !isAppUnlocked) {
                    authenticateWithBiometrics();
                    return;
                }
                startActivity(new Intent(MainActivity.this, TelebirrPaymentActivity.class));
            }
        });

        cardNavDictionary.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isAppLockEnabled() && !isAppUnlocked) {
                    authenticateWithBiometrics();
                    return;
                }
                startActivity(new Intent(MainActivity.this, TigrinyaDictionaryActivity.class));
            }
        });

        cardSystemStatus.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isAppLockEnabled() && !isAppUnlocked) {
                    authenticateWithBiometrics();
                    return;
                }
                startActivity(new Intent(MainActivity.this, SystemDiagnosticsActivity.class));
            }
        });
    }
}
