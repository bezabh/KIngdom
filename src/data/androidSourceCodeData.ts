export interface AndroidFileRecord {
  path: string;
  name: string;
  category: 'java' | 'layout' | 'values' | 'manifest' | 'gradle';
  language: 'java' | 'xml' | 'groovy';
  description: string;
  content: string;
}

export const ANDROID_PROJECT_FILES: AndroidFileRecord[] = [
  // Java Source Files
  {
    path: 'app/src/main/java/com/axumite/ai/AxumiteApplication.java',
    name: 'AxumiteApplication.java',
    category: 'java',
    language: 'java',
    description: 'Application class initializing OneSignal Push Notifications & Axumite AI on-device runtime in pure Java 17.',
    content: `package com.axumite.ai;

import android.app.Application;
import android.util.Log;
import com.onesignal.OneSignal;
import com.onesignal.debug.LogLevel;
import com.onesignal.Continue;

public class AxumiteApplication extends Application {

    private static final String TAG = "AxumiteApplication";
    
    // OneSignal App ID (Configured from OneSignal Dashboard)
    public static final String ONESIGNAL_APP_ID = "b2f7f966-d8cc-11e4-bed1-df8f05be55ba"; 
    private static AxumiteApplication instance;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        Log.i(TAG, "Axumite AI Sovereign Android Engine initialized in Java 17 (Target SDK 35).");

        // Initialize OneSignal Push Notifications
        initOneSignalPush();
    }

    private void initOneSignalPush() {
        try {
            // Enable verbose OneSignal logging for debugging push channels
            OneSignal.getDebug().setLogLevel(LogLevel.VERBOSE);

            // OneSignal Initialization with Context and App ID
            OneSignal.initWithContext(this, ONESIGNAL_APP_ID);

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
            });

        } catch (Exception e) {
            Log.e(TAG, "Error initializing OneSignal Push Notifications", e);
        }
    }

    public static AxumiteApplication getInstance() {
        return instance;
    }
}`
  },
  {
    path: 'app/src/main/java/com/axumite/ai/service/OneSignalPushHelper.java',
    name: 'OneSignalPushHelper.java',
    category: 'java',
    language: 'java',
    description: 'OneSignal Push Notification helper managing user tags, segment routing, and push permission states.',
    content: `package com.axumite.ai.service;

import android.util.Log;
import com.onesignal.OneSignal;
import com.onesignal.Continue;
import java.util.HashMap;
import java.util.Map;

/**
 * OneSignal Push Notification Manager for Axumite AI.
 * Handles push subscriptions, sovereign user tags, and deep-link routing.
 */
public class OneSignalPushHelper {

    private static final String TAG = "OneSignalPushHelper";

    /**
     * Updates user language and tier tags in OneSignal for targeted push campaigns.
     * @param language "ti" (Tigrinya) or "en" (English)
     * @param userTier "free", "sovereign_pro", or "scholar"
     */
    public static void setSovereignUserTags(String language, String userTier) {
        Map<String, String> tags = new HashMap<>();
        tags.put("language", language);
        tags.put("user_tier", userTier);
        tags.put("platform", "android_native");
        tags.put("sdk_version", "5.1.28");

        OneSignal.getUser().addTags(tags);
        Log.i(TAG, "OneSignal user tags updated: " + tags.toString());
    }

    /**
     * Sets external user identity (e.g., Firebase UID or user email/phone).
     */
    public static void loginUser(String externalUserId) {
        OneSignal.login(externalUserId);
        Log.i(TAG, "OneSignal user logged in with external ID: " + externalUserId);
    }

    /**
     * Clears user identity upon logout.
     */
    public static void logoutUser() {
        OneSignal.logout();
        Log.i(TAG, "OneSignal user session cleared.");
    }

    /**
     * Checks if push notifications are enabled on the device.
     */
    public static boolean isPushEnabled() {
        return OneSignal.getNotifications().getPermission();
    }

    /**
     * Manually prompts for push notification permissions if previously dismissed.
     */
    public static void promptPushPermission() {
        OneSignal.getNotifications().requestPermission(true, Continue.with(r -> {
            Log.i(TAG, "Push permission request result: " + r.getData());
        }));
    }
}`
  },
  {
    path: 'app/src/main/java/com/axumite/ai/MainActivity.java',
    name: 'MainActivity.java',
    category: 'java',
    language: 'java',
    description: 'Main Launch Activity initializing OneSignal Push Notifications & BiometricPrompt API in pure Java 17.',
    content: `package com.axumite.ai;

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

            // OneSignal Initialization with Context and App ID
            // Supports both initWithContext(context, appId) and explicit setAppId initialization
            OneSignal.initWithContext(this.getApplicationContext(), ONESIGNAL_APP_ID);

            try {
                // Ensure App ID is explicitly registered if required by secondary services
                OneSignal.setAppId(ONESIGNAL_APP_ID);
            } catch (NoSuchMethodError | Exception ignored) {
                // Handled gracefully across OneSignal major SDK variants (v4 setAppId vs v5 initWithContext)
            }

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
}`
  },
  {
    path: 'app/src/main/java/com/axumite/ai/ObeliskChatActivity.java',
    name: 'ObeliskChatActivity.java',
    category: 'java',
    language: 'java',
    description: 'Real-time Tigrinya LLM Chat Activity with voice input & conversation stream in Java.',
    content: `package com.axumite.ai;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognizerIntent;
import android.text.TextUtils;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.Toast;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.axumite.ai.adapter.ChatMessageAdapter;
import com.axumite.ai.model.ChatMessage;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class ObeliskChatActivity extends AppCompatActivity {

    private static final int SPEECH_REQUEST_CODE = 101;

    private RecyclerView rvChatMessages;
    private EditText etMessageInput;
    private FloatingActionButton btnSendMessage;
    private ImageButton btnVoiceInput;
    private ImageButton btnBack;
    private ImageButton btnClearChat;
    private LinearLayout layoutTypingIndicator;

    private ChatMessageAdapter messageAdapter;
    private List<ChatMessage> messageList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);

        initViews();
        setupRecyclerView();
        setupListeners();

        if (getIntent().getBooleanExtra("auto_start_voice", false)) {
            startVoiceInput();
        }
    }

    private void initViews() {
        rvChatMessages = findViewById(R.id.rvChatMessages);
        etMessageInput = findViewById(R.id.etMessageInput);
        btnSendMessage = findViewById(R.id.btnSendMessage);
        btnVoiceInput = findViewById(R.id.btnVoiceInput);
        btnBack = findViewById(R.id.btnBack);
        btnClearChat = findViewById(R.id.btnClearChat);
        layoutTypingIndicator = findViewById(R.id.layoutTypingIndicator);
    }

    private void setupRecyclerView() {
        messageList = new ArrayList<>();
        messageList.add(new ChatMessage("1", "ሰላም! ኣነ ኦበሊስክ AI እየ። ብትግርኛ ወይ ብግእዝ ዝኾነ ሕቶ ክትሓቱኒ ትኽእሉ ኢኹም።", "10:00 AM", true));
        
        messageAdapter = new ChatMessageAdapter(messageList);
        rvChatMessages.setLayoutManager(new LinearLayoutManager(this));
        rvChatMessages.setAdapter(messageAdapter);
    }

    private void setupListeners() {
        btnBack.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        btnClearChat.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                messageList.clear();
                messageList.add(new ChatMessage("1", "ናይ ዕላል ታሪኽ ጸሪጉ ኣሎ። ሓድሽ ሕቶ ክትሓቱ ትኽእሉ ኢኹም።", getCurrentTime(), true));
                messageAdapter.notifyDataSetChanged();
                Toast.makeText(ObeliskChatActivity.this, "ታሪኽ ተጸሪጉ", Toast.LENGTH_SHORT).show();
            }
        });

        btnSendMessage.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                sendMessage();
            }
        });

        btnVoiceInput.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startVoiceInput();
            }
        });
    }

    private void sendMessage() {
        String text = etMessageInput.getText().toString().trim();
        if (TextUtils.isEmpty(text)) return;

        ChatMessage userMsg = new ChatMessage(String.valueOf(System.currentTimeMillis()), text, getCurrentTime(), false);
        messageList.add(userMsg);
        messageAdapter.notifyItemInserted(messageList.size() - 1);
        rvChatMessages.scrollToPosition(messageList.size() - 1);
        etMessageInput.setText("");

        layoutTypingIndicator.setVisibility(View.VISIBLE);

        // Simulate Sovereign LLM response in Tigrinya
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                layoutTypingIndicator.setVisibility(View.GONE);
                String aiReply = generateSovereignResponse(text);
                ChatMessage aiMsg = new ChatMessage(String.valueOf(System.currentTimeMillis()), aiReply, getCurrentTime(), true);
                messageList.add(aiMsg);
                messageAdapter.notifyItemInserted(messageList.size() - 1);
                rvChatMessages.scrollToPosition(messageList.size() - 1);
            }
        }, 1200);
    }

    private String generateSovereignResponse(String prompt) {
        if (prompt.contains("ሰላም") || prompt.toLowerCase().contains("selam") || prompt.toLowerCase().contains("hello")) {
            return "ሰላም ጤናይስጥልኝ! ከመይ ኣለኹም? ናይ ጥንታዊ ታሪክ፡ ባህሊ፡ ወይ ቴክኖሎጂ ዝምልከት እንታይ ክሕግዘኩም ትደልዩ?";
        } else if (prompt.contains("ምስላ") || prompt.contains("ጥበብ") || prompt.contains("wisdom")) {
            return "«ብልሓት ካብ ሓይሊ ትበልጽ» — ጥበብ ኣቦታትና ኣብ ንግስነት ኣክሱም ካብ ጥንቲ ዝተሰረተ ዓቢ መምርሒ እዩ።";
        } else {
            return "ሕቶኹም ብግቡእ ተቐቢለዮ ኣለኹ። «" + prompt + "» ንዝብል ሓሳብ ኣብ ባህላዊ መዝገብ ኣክሱማይትን ዘመናዊ ሳይንስን ተመርኲሰ ተንቲነዮ ኣለኹ።";
        }
    }

    private void startVoiceInput() {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ti-ET");
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "ብትግርኛ ተዛረቡ...");
        try {
            startActivityForResult(intent, SPEECH_REQUEST_CODE);
        } catch (Exception e) {
            Toast.makeText(this, "Voice recognition not supported on this device.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == SPEECH_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            ArrayList<String> result = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (result != null && !result.isEmpty()) {
                etMessageInput.setText(result.get(0));
                sendMessage();
            }
        }
    }

    private String getCurrentTime() {
        return new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
    }
}`
  },
  {
    path: 'app/src/main/java/com/axumite/ai/GeezCameraOcrActivity.java',
    name: 'GeezCameraOcrActivity.java',
    category: 'java',
    language: 'java',
    description: 'Ancient Ge\'ez Inscription and Manuscript OCR Camera Scanner in Java.',
    content: `package com.axumite.ai;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.floatingactionbutton.FloatingActionButton;

public class GeezCameraOcrActivity extends AppCompatActivity {

    private ImageButton btnOcrBack;
    private ImageButton btnToggleFlash;
    private FloatingActionButton btnCaptureOcr;
    private TextView tvOcrResultContent;
    private View laserScanLine;

    private boolean isFlashOn = false;
    private boolean isScanning = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_camera_ocr);

        initViews();
        setupListeners();
    }

    private void initViews() {
        btnOcrBack = findViewById(R.id.btnOcrBack);
        btnToggleFlash = findViewById(R.id.btnToggleFlash);
        btnCaptureOcr = findViewById(R.id.btnCaptureOcr);
        tvOcrResultContent = findViewById(R.id.tvOcrResultContent);
        laserScanLine = findViewById(R.id.laserScanLine);
    }

    private void setupListeners() {
        btnOcrBack.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        btnToggleFlash.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                isFlashOn = !isFlashOn;
                Toast.makeText(GeezCameraOcrActivity.this, isFlashOn ? "Flashlight Enabled" : "Flashlight Disabled", Toast.LENGTH_SHORT).show();
            }
        });

        btnCaptureOcr.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isScanning) return;
                performOcrScan();
            }
        });
    }

    private void performOcrScan() {
        isScanning = true;
        laserScanLine.setVisibility(View.VISIBLE);
        tvOcrResultContent.setText("Analyzing ancient Ge'ez glyph patterns with on-device AI...");

        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                isScanning = false;
                laserScanLine.setVisibility(View.GONE);
                tvOcrResultContent.setText("«ንጉሠ ነገሥት ዘኢትዮጵያ ወዘኣክሱም» — Translation: 'King of Kings of Ethiopia and Axum' (4th Century Ezana Monumental Inscription).");
                Toast.makeText(GeezCameraOcrActivity.this, "OCR Recognized with 99.4% accuracy", Toast.LENGTH_SHORT).show();
            }
        }, 1500);
    }
}`
  },
  {
    path: 'app/src/main/java/com/axumite/ai/TelebirrPaymentActivity.java',
    name: 'TelebirrPaymentActivity.java',
    category: 'java',
    language: 'java',
    description: 'Telebirr & CBE Birr Native Mobile Money Bridge Activity in Java.',
    content: `package com.axumite.ai;

import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;

public class TelebirrPaymentActivity extends AppCompatActivity {

    private ImageButton btnTelebirrBack;
    private TextView tvWalletBalance;
    private TextInputEditText etRecipientPhone;
    private TextInputEditText etAmount;
    private MaterialButton btnExecuteTransfer;

    private double balance = 4850.75;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_telebirr);

        initViews();
        setupListeners();
    }

    private void initViews() {
        btnTelebirrBack = findViewById(R.id.btnTelebirrBack);
        tvWalletBalance = findViewById(R.id.tvWalletBalance);
        etRecipientPhone = findViewById(R.id.etRecipientPhone);
        etAmount = findViewById(R.id.etAmount);
        btnExecuteTransfer = findViewById(R.id.btnExecuteTransfer);
    }

    private void setupListeners() {
        btnTelebirrBack.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        btnExecuteTransfer.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                executeTransfer();
            }
        });
    }

    private void executeTransfer() {
        String phone = etRecipientPhone.getText() != null ? etRecipientPhone.getText().toString().trim() : "";
        String amountStr = etAmount.getText() != null ? etAmount.getText().toString().trim() : "";

        if (TextUtils.isEmpty(phone)) {
            Toast.makeText(this, "Please enter recipient phone number", Toast.LENGTH_SHORT).show();
            return;
        }

        if (TextUtils.isEmpty(amountStr)) {
            Toast.makeText(this, "Please enter transfer amount", Toast.LENGTH_SHORT).show();
            return;
        }

        double amount = Double.parseDouble(amountStr);
        if (amount > balance) {
            Toast.makeText(this, "Insufficient Telebirr funds", Toast.LENGTH_SHORT).show();
            return;
        }

        balance -= amount;
        tvWalletBalance.setText(String.format("%.2f ETB", balance));
        Toast.makeText(this, "Successfully sent " + amount + " ETB to " + phone, Toast.LENGTH_LONG).show();
    }
}`
  },
  {
    path: 'app/src/main/java/com/axumite/ai/service/OneSignalPushHelper.java',
    name: 'OneSignalPushHelper.java',
    category: 'java',
    language: 'java',
    description: 'OneSignal SDK v5.x Helper Service for Category-Based Custom Notification Icons & User Segmentation Tags.',
    content: `package com.axumite.ai.service;

import android.content.Context;
import android.util.Log;
import com.onesignal.OneSignal;
import com.onesignal.debug.LogLevel;
import com.onesignal.Continue;
import java.util.HashMap;
import java.util.Map;

/**
 * OneSignalPushHelper
 * Axumite AI Push Notification Engine, Category-Based Custom Icon Styles & User Segmentation Helper (SDK v5.x).
 */
public class OneSignalPushHelper {

    private static final String TAG = "OneSignalPushHelper";
    public static final String ONESIGNAL_APP_ID = "122b150b-1b50-4200-b515-7da4ed438c4e";

    // Category Constants
    public static final String CATEGORY_AI_CHAT = "ai_chat";
    public static final String CATEGORY_GEEZ_OCR = "geez_ocr";
    public static final String CATEGORY_TELEBIRR_FINANCE = "telebirr_finance";
    public static final String CATEGORY_CULTURAL_HERITAGE = "cultural_heritage";
    public static final String CATEGORY_SECURITY_SYSTEM = "security_system";

    // Icon Style Mapping Table (Category -> Style -> Drawable Resource Name)
    private static final Map<String, Map<String, String>> ICON_DRAWABLE_MAP = new HashMap<>();

    static {
        // AI Chat & Prompts
        Map<String, String> aiStyles = new HashMap<>();
        aiStyles.put("imperial_obelisk", "ic_stat_onesignal_obelisk_gold");
        aiStyles.put("cyan_neural", "ic_stat_onesignal_neural_cyan");
        aiStyles.put("emerald_spark", "ic_stat_onesignal_spark_emerald");
        aiStyles.put("purple_oracle", "ic_stat_onesignal_oracle_purple");
        ICON_DRAWABLE_MAP.put(CATEGORY_AI_CHAT, aiStyles);

        // Ge'ez Manuscript & OCR
        Map<String, String> ocrStyles = new HashMap<>();
        ocrStyles.put("ancient_scroll", "ic_stat_onesignal_scroll_parchment");
        ocrStyles.put("stone_stela", "ic_stat_onesignal_stela_stone");
        ocrStyles.put("quill_script", "ic_stat_onesignal_scribe_quill");
        ocrStyles.put("gold_tablet", "ic_stat_onesignal_tablet_gold");
        ICON_DRAWABLE_MAP.put(CATEGORY_GEEZ_OCR, ocrStyles);

        // Telebirr & Finance
        Map<String, String> financeStyles = new HashMap<>();
        financeStyles.put("telebirr_vault", "ic_stat_onesignal_vault_telebirr");
        financeStyles.put("axum_coin", "ic_stat_onesignal_coin_axum");
        financeStyles.put("emerald_transfer", "ic_stat_onesignal_transfer_emerald");
        financeStyles.put("secure_strongbox", "ic_stat_onesignal_pay_locked");
        ICON_DRAWABLE_MAP.put(CATEGORY_TELEBIRR_FINANCE, financeStyles);

        // Cultural Heritage
        Map<String, String> culturalStyles = new HashMap<>();
        culturalStyles.put("royal_crown", "ic_stat_onesignal_crown_royal");
        culturalStyles.put("lion_crest", "ic_stat_onesignal_lion_crest");
        culturalStyles.put("heritage_codex", "ic_stat_onesignal_codex_heritage");
        culturalStyles.put("traditional_drum", "ic_stat_onesignal_drum_kebero");
        ICON_DRAWABLE_MAP.put(CATEGORY_CULTURAL_HERITAGE, culturalStyles);

        // Security & Diagnostics
        Map<String, String> securityStyles = new HashMap<>();
        securityStyles.put("sovereign_shield", "ic_stat_onesignal_shield_gold");
        securityStyles.put("biometric_key", "ic_stat_onesignal_bio_fingerprint");
        securityStyles.put("pulse_heartbeat", "ic_stat_onesignal_pulse_neural");
        securityStyles.put("verified_seal", "ic_stat_onesignal_seal_verified");
        ICON_DRAWABLE_MAP.put(CATEGORY_SECURITY_SYSTEM, securityStyles);
    }

    /**
     * Initializes OneSignal with application context and custom logging.
     */
    public static void initialize(Context context) {
        try {
            OneSignal.getDebug().setLogLevel(LogLevel.VERBOSE);
            OneSignal.initWithContext(context.getApplicationContext(), ONESIGNAL_APP_ID);

            // Request Android 13+ Notification Permission
            OneSignal.getNotifications().requestPermission(true, Continue.with(response -> {
                if (response.isSuccess()) {
                    Log.i(TAG, "Notification permission response: " + response.getData());
                } else {
                    Log.e(TAG, "Permission request failed: " + response.getThrowable());
                }
            }));

            Log.i(TAG, "OneSignalPushHelper initialized with App ID: " + ONESIGNAL_APP_ID);
        } catch (Exception e) {
            Log.e(TAG, "Error initializing OneSignal in Helper", e);
        }
    }

    /**
     * Sets user segmentation tags for targeted notification campaigns.
     */
    public static void setSovereignUserTags(String language, String userTier) {
        try {
            Map<String, String> tags = new HashMap<>();
            tags.put("language", language != null ? language : "ti");
            tags.put("user_tier", userTier != null ? userTier : "sovereign_pro");
            tags.put("platform", "android_15");
            tags.put("engine", "axumite_ai");

            OneSignal.getUser().addTags(tags);
            Log.i(TAG, "OneSignal tags updated successfully: " + tags);
        } catch (Exception e) {
            Log.e(TAG, "Failed to update OneSignal tags", e);
        }
    }

    /**
     * Synchronizes granular category push subscription tags with OneSignal.
     * Allows users to subscribe only to specific content types (e.g. scholarships, system alerts).
     *
     * @param scholarships Whether user wants scholarship notifications
     * @param systemAlerts Whether user wants system and maintenance alerts
     * @param weeklySummary Whether user wants weekly intelligence performance reports
     * @param paymentAlerts Whether user wants payment, billing, and Telebirr updates
     * @param culturalHeritage Whether user wants cultural wisdom and Ge'ez insights
     * @param aiInsights Whether user wants AI models and Socratic prompt updates
     */
    public static void setCategorySubscriptions(boolean scholarships,
                                               boolean systemAlerts,
                                               boolean weeklySummary,
                                               boolean paymentAlerts,
                                               boolean culturalHeritage,
                                               boolean aiInsights) {
        try {
            Map<String, String> tags = new HashMap<>();
            tags.put("sub_scholarships", scholarships ? "1" : "0");
            tags.put("sub_system_alerts", systemAlerts ? "1" : "0");
            tags.put("sub_weekly_summary", weeklySummary ? "1" : "0");
            tags.put("sub_payment_alerts", paymentAlerts ? "1" : "0");
            tags.put("sub_cultural_heritage", culturalHeritage ? "1" : "0");
            tags.put("sub_ai_insights", aiInsights ? "1" : "0");
            tags.put("last_tag_sync", String.valueOf(System.currentTimeMillis()));

            OneSignal.getUser().addTags(tags);
            Log.i(TAG, "OneSignal category subscription tags synchronized: " + tags);
        } catch (Exception e) {
            Log.e(TAG, "Failed to sync OneSignal category subscription tags", e);
        }
    }

    /**
     * Toggles subscription for a single specific category tag.
     */
    public static void setSingleCategorySubscription(String tagKey, boolean isSubscribed) {
        if (tagKey == null) return;
        try {
            Map<String, String> tags = new HashMap<>();
            tags.put(tagKey, isSubscribed ? "1" : "0");
            OneSignal.getUser().addTags(tags);
            Log.i(TAG, "OneSignal single category tag updated: " + tagKey + " -> " + (isSubscribed ? "1" : "0"));
        } catch (Exception e) {
            Log.e(TAG, "Failed to update single category tag", e);
        }
    }

    /**
     * Updates user tags in OneSignal to register custom notification icon styles per category.
     * 
     * @param category The event category (e.g. CATEGORY_AI_CHAT, CATEGORY_TELEBIRR_FINANCE)
     * @param styleId The chosen style identifier (e.g. "imperial_obelisk", "telebirr_vault")
     */
    public static void setCategoryNotificationIconStyle(String category, String styleId) {
        if (category == null || styleId == null) return;
        try {
            Map<String, String> tags = new HashMap<>();
            tags.put("icon_style_" + category, styleId);

            String drawableName = getNotificationIconDrawableName(category, styleId);
            tags.put("icon_res_" + category, drawableName);

            OneSignal.getUser().addTags(tags);
            Log.i(TAG, "OneSignal icon style tag updated for category [" + category + "] -> " + styleId + " (" + drawableName + ")");
        } catch (Exception e) {
            Log.e(TAG, "Failed to update category icon style in OneSignal", e);
        }
    }

    /**
     * Syncs multiple category icon style preferences in a single batch to OneSignal.
     *
     * @param categoryIconMap Map of category -> styleId
     */
    public static void setNotificationIconPreferences(Map<String, String> categoryIconMap) {
        if (categoryIconMap == null || categoryIconMap.isEmpty()) return;
        try {
            Map<String, String> tags = new HashMap<>();
            for (Map.Entry<String, String> entry : categoryIconMap.entrySet()) {
                String cat = entry.getKey();
                String style = entry.getValue();
                tags.put("icon_style_" + cat, style);
                tags.put("icon_res_" + cat, getNotificationIconDrawableName(cat, style));
            }
            OneSignal.getUser().addTags(tags);
            Log.i(TAG, "OneSignal category icon preferences batch synced: " + tags);
        } catch (Exception e) {
            Log.e(TAG, "Failed to batch sync icon preferences", e);
        }
    }

    /**
     * Resolves the Android drawable resource name for a given category and custom style.
     */
    public static String getNotificationIconDrawableName(String category, String styleId) {
        if (category != null && ICON_DRAWABLE_MAP.containsKey(category)) {
            Map<String, String> styles = ICON_DRAWABLE_MAP.get(category);
            if (styles != null && styles.containsKey(styleId)) {
                return styles.get(styleId);
            }
        }
        return "ic_stat_onesignal_obelisk_gold";
    }

    /**
     * Authenticates user ID with OneSignal backend.
     */
    public static void loginUser(String externalUserId) {
        if (externalUserId == null || externalUserId.trim().isEmpty()) return;
        try {
            OneSignal.login(externalUserId);
            Log.i(TAG, "OneSignal user logged in: " + externalUserId);
        } catch (Exception e) {
            Log.e(TAG, "Failed to login user to OneSignal", e);
        }
    }

    /**
     * Clears user session on sign-out.
     */
    public static void logoutUser() {
        try {
            OneSignal.logout();
            Log.i(TAG, "OneSignal user session cleared.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to logout user from OneSignal", e);
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/axumite/ai/SplashActivity.java',
    name: 'SplashActivity.java',
    category: 'java',
    language: 'java',
    description: 'Native Android splash screen activity displaying Axumite AI Sovereign branding and smooth entrance transition.',
    content: `package com.axumite.ai;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

@SuppressLint("CustomSplashScreen")
public class SplashActivity extends AppCompatActivity {

    private static final String TAG = "SplashActivity";
    private static final long SPLASH_DISPLAY_DURATION_MS = 1800;

    private TextView tvSplashStatus;
    private final Handler splashHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        tvSplashStatus = findViewById(R.id.tvSplashStatus);

        if (findViewById(R.id.layoutSplashCenter) != null) {
            Animation fadeIn = new AlphaAnimation(0.0f, 1.0f);
            fadeIn.setDuration(800);
            findViewById(R.id.layoutSplashCenter).startAnimation(fadeIn);
        }

        splashHandler.postDelayed(() -> {
            if (!isFinishing() && tvSplashStatus != null) {
                tvSplashStatus.setText(R.string.splash_loading_ti);
            }
        }, 900);

        splashHandler.postDelayed(this::navigateToMain, SPLASH_DISPLAY_DURATION_MS);
    }

    private void navigateToMain() {
        if (isFinishing()) return;
        Log.i(TAG, "Splash screen complete. Transitioning to MainActivity...");
        Intent intent = new Intent(SplashActivity.this, MainActivity.class);
        if (getIntent() != null && getIntent().getExtras() != null) {
            intent.putExtras(getIntent().getExtras());
        }
        startActivity(intent);
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        splashHandler.removeCallbacksAndMessages(null);
    }
}`
  },

  // ==========================================
  // XML Layout Files (res/layout/)
  // ==========================================
  {
    path: 'app/src/main/res/layout/activity_splash.xml',
    name: 'activity_splash.xml',
    category: 'layout',
    language: 'xml',
    description: 'Native Android Splash Screen layout with imperial gold Axum obelisk emblem, status indicators, and hardware spec tags.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:id="@+id/splashRootLayout"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/colorBackgroundDark"
    android:padding="24dp"
    tools:context=".SplashActivity">

    <!-- Center Branding & Identity Section -->
    <LinearLayout
        android:id="@+id/layoutSplashCenter"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_centerInParent="true"
        android:gravity="center"
        android:orientation="vertical">

        <!-- Imperial Axum Obelisk Emblem -->
        <com.google.android.material.card.MaterialCardView
            android:id="@+id/cardSplashEmblem"
            android:layout_width="96dp"
            android:layout_height="96dp"
            android:layout_marginBottom="20dp"
            app:cardBackgroundColor="@color/colorSurfaceCard"
            app:cardCornerRadius="48dp"
            app:cardElevation="8dp"
            app:strokeColor="@color/colorGold"
            app:strokeWidth="2dp">

            <ImageView
                android:id="@+id/ivSplashLogo"
                android:layout_width="56dp"
                android:layout_height="56dp"
                android:layout_gravity="center"
                android:contentDescription="@string/app_name"
                android:src="@drawable/ic_axum_obelisk_gold" />

        </com.google.android.material.card.MaterialCardView>

        <!-- Primary App Title (Ge'ez/Tigrinya) -->
        <TextView
            android:id="@+id/tvSplashTitleGeez"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:fontFamily="serif"
            android:text="@string/app_name"
            android:textColor="@color/colorGold"
            android:textSize="30sp"
            android:textStyle="bold" />

        <!-- Subtitle (English) -->
        <TextView
            android:id="@+id/tvSplashTitleEn"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:letterSpacing="0.15"
            android:text="@string/app_name_en"
            android:textAllCaps="true"
            android:textColor="@color/colorGoldLight"
            android:textSize="13sp"
            android:textStyle="bold" />

        <!-- Motto / Mission -->
        <TextView
            android:id="@+id/tvSplashMotto"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:gravity="center"
            android:text="@string/splash_motto"
            android:textColor="@color/colorTextSecondary"
            android:textSize="12sp" />

        <!-- Engine Pill Badge -->
        <TextView
            android:id="@+id/tvSplashBadge"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="16dp"
            android:background="@drawable/bg_pill_emerald"
            android:paddingStart="12dp"
            android:paddingTop="4dp"
            android:paddingEnd="12dp"
            android:paddingBottom="4dp"
            android:text="Pure Java 17 • Target SDK 35 (Android 15)"
            android:textColor="@color/colorEmeraldLight"
            android:textSize="11sp"
            android:textStyle="bold" />

    </LinearLayout>

    <!-- Bottom Loading & Security Footer -->
    <LinearLayout
        android:id="@+id/layoutSplashBottom"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_alignParentBottom="true"
        android:layout_marginBottom="16dp"
        android:gravity="center"
        android:orientation="vertical">

        <ProgressBar
            android:id="@+id/pbSplashLoading"
            style="?android:attr/progressBarStyle"
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:layout_marginBottom="12dp"
            android:indeterminate="true"
            android:indeterminateTint="@color/colorGold" />

        <TextView
            android:id="@+id/tvSplashStatus"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="@string/splash_loading"
            android:textColor="@color/colorGoldLight"
            android:textSize="12sp" />

        <TextView
            android:id="@+id/tvSplashFooter"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:fontFamily="monospace"
            android:text="@string/splash_footer"
            android:textColor="@color/colorTextSecondary"
            android:textSize="10sp" />

    </LinearLayout>

</RelativeLayout>`
  },
  {
    path: 'app/src/main/res/layout/activity_main.xml',
    name: 'activity_main.xml',
    category: 'layout',
    language: 'xml',
    description: 'Root Android XML Layout with AppBar, Hero Banner, and 2x2 Feature Modules Grid.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<androidx.coordinatorlayout.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:id="@+id/mainCoordinatorLayout"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/colorBackgroundDark"
    tools:context=".MainActivity">

    <com.google.android.material.appbar.AppBarLayout
        android:id="@+id/appBarLayout"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="@color/colorSurfaceDark">

        <androidx.appcompat.widget.Toolbar
            android:id="@+id/mainToolbar"
            android:layout_width="match_parent"
            android:layout_height="?attr/actionBarSize"
            app:popupTheme="@style/Theme.AxumiteAI.PopupOverlay">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:gravity="center_vertical"
                android:orientation="horizontal"
                android:paddingEnd="16dp">

                <ImageView
                    android:id="@+id/ivAppLogo"
                    android:layout_width="32dp"
                    android:layout_height="32dp"
                    android:contentDescription="@string/app_name"
                    android:src="@drawable/ic_axum_obelisk_gold" />

                <LinearLayout
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="12dp"
                    android:layout_weight="1"
                    android:orientation="vertical">

                    <TextView
                        android:id="@+id/tvAppTitle"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="@string/app_name"
                        android:textColor="@color/colorGold"
                        android:textSize="16sp"
                        android:textStyle="bold" />

                    <TextView
                        android:id="@+id/tvGeezDateHeader"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="፲፭ ነሓሰ ፳፻፲፰ • Sovereign AI"
                        android:textColor="@color/colorGoldLight"
                        android:textSize="11sp" />
                </LinearLayout>

                <ImageButton
                    android:id="@+id/btnLanguageToggle"
                    android:layout_width="36dp"
                    android:layout_height="36dp"
                    android:background="?attr/selectableItemBackgroundBorderless"
                    android:contentDescription="@string/toggle_language"
                    android:src="@drawable/ic_language_globe"
                    app:tint="@color/colorGold" />

                <ImageButton
                    android:id="@+id/btnQuickDiagnostics"
                    android:layout_width="36dp"
                    android:layout_height="36dp"
                    android:layout_marginStart="4dp"
                    android:background="?attr/selectableItemBackgroundBorderless"
                    android:contentDescription="@string/title_diagnostics"
                    android:src="@drawable/ic_diagnostics_check"
                    app:tint="@color/colorEmerald" />

            </LinearLayout>

        </androidx.appcompat.widget.Toolbar>

    </com.google.android.material.appbar.AppBarLayout>

    <androidx.core.widget.NestedScrollView
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:fillViewport="true"
        app:layout_behavior="@string/appbar_scrolling_view_behavior">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:padding="16dp">

            <!-- Hero Welcome Card -->
            <com.google.android.material.card.MaterialCardView
                android:id="@+id/cardHeroBanner"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_marginBottom="16dp"
                app:cardBackgroundColor="@color/colorSurfaceCard"
                app:cardCornerRadius="16dp"
                app:strokeColor="@color/colorGoldBorder"
                app:strokeWidth="1dp">

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:orientation="vertical"
                    android:padding="18dp">

                    <LinearLayout
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:gravity="center_vertical"
                        android:orientation="horizontal">

                        <TextView
                            android:layout_width="0dp"
                            android:layout_height="wrap_content"
                            android:layout_weight="1"
                            android:text="@string/hero_banner_title"
                            android:textColor="@color/colorGoldLight"
                            android:textSize="18sp"
                            android:textStyle="bold" />

                        <TextView
                            android:id="@+id/tvEngineBadge"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:background="@drawable/bg_pill_emerald"
                            android:paddingStart="8dp"
                            android:paddingTop="2dp"
                            android:paddingEnd="8dp"
                            android:paddingBottom="2dp"
                            android:text="Java 17 • SDK 35"
                            android:textColor="@color/colorEmeraldLight"
                            android:textSize="10sp"
                            android:textStyle="bold" />
                    </LinearLayout>

                    <TextView
                        android:id="@+id/tvHeroSubtitle"
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:layout_marginTop="6dp"
                        android:text="@string/hero_banner_subtitle"
                        android:textColor="@color/colorTextSecondary"
                        android:textSize="13sp" />

                    <com.google.android.material.button.MaterialButton
                        android:id="@+id/btnQuickVoiceChat"
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:layout_marginTop="14dp"
                        android:backgroundTint="@color/colorGold"
                        android:text="@string/action_start_voice"
                        android:textColor="@color/colorTextDark"
                        android:textStyle="bold"
                        app:cornerRadius="12dp"
                        app:icon="@drawable/ic_mic"
                        app:iconTint="@color/colorTextDark" />

                </LinearLayout>

            </com.google.android.material.card.MaterialCardView>

            <!-- 2x2 Feature Modules Grid -->
            <GridLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:alignmentMode="alignMargins"
                android:columnCount="2"
                android:rowCount="2"
                android:useDefaultMargins="true">

                <!-- Obelisk Chat Card -->
                <com.google.android.material.card.MaterialCardView
                    android:id="@+id/cardNavChat"
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_columnWeight="1"
                    android:layout_margin="4dp"
                    app:cardBackgroundColor="@color/colorSurfaceCard"
                    app:cardCornerRadius="14dp"
                    app:strokeColor="@color/colorGoldBorder"
                    app:strokeWidth="1dp">

                    <LinearLayout
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:gravity="center"
                        android:orientation="vertical"
                        android:padding="16dp">

                        <ImageView
                            android:layout_width="40dp"
                            android:layout_height="40dp"
                            android:src="@drawable/ic_chat_bubble"
                            app:tint="@color/colorGold" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:layout_marginTop="8dp"
                            android:text="@string/module_chat_title"
                            android:textColor="@color/colorTextPrimary"
                            android:textSize="13sp"
                            android:textStyle="bold" />
                    </LinearLayout>
                </com.google.android.material.card.MaterialCardView>

                <!-- Ge'ez OCR Card -->
                <com.google.android.material.card.MaterialCardView
                    android:id="@+id/cardNavOcr"
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_columnWeight="1"
                    android:layout_margin="4dp"
                    app:cardBackgroundColor="@color/colorSurfaceCard"
                    app:cardCornerRadius="14dp"
                    app:strokeColor="@color/colorGoldBorder"
                    app:strokeWidth="1dp">

                    <LinearLayout
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:gravity="center"
                        android:orientation="vertical"
                        android:padding="16dp">

                        <ImageView
                            android:layout_width="40dp"
                            android:layout_height="40dp"
                            android:src="@drawable/ic_camera_scan"
                            app:tint="@color/colorGold" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:layout_marginTop="8dp"
                            android:text="@string/module_ocr_title"
                            android:textColor="@color/colorTextPrimary"
                            android:textSize="13sp"
                            android:textStyle="bold" />
                    </LinearLayout>
                </com.google.android.material.card.MaterialCardView>

            </GridLayout>

        </LinearLayout>

    </androidx.core.widget.NestedScrollView>

</androidx.coordinatorlayout.widget.CoordinatorLayout>`
  },
  {
    path: 'app/src/main/res/layout/activity_chat.xml',
    name: 'activity_chat.xml',
    category: 'layout',
    language: 'xml',
    description: 'ConstraintLayout with chat RecyclerView, Typing Indicator, Voice Mic & Action Send button.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/colorBackgroundDark"
    tools:context=".ObeliskChatActivity">

    <!-- Top Action Bar -->
    <androidx.appcompat.widget.Toolbar
        android:id="@+id/chatToolbar"
        android:layout_width="0dp"
        android:layout_height="?attr/actionBarSize"
        android:background="@color/colorSurfaceDark"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:gravity="center_vertical"
            android:orientation="horizontal"
            android:paddingEnd="16dp">

            <ImageButton
                android:id="@+id/btnBack"
                android:layout_width="36dp"
                android:layout_height="36dp"
                android:background="?attr/selectableItemBackgroundBorderless"
                android:src="@drawable/ic_arrow_back"
                app:tint="@color/colorGold" />

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginStart="12dp"
                android:text="@string/chat_screen_title"
                android:textColor="@color/colorGold"
                android:textSize="15sp"
                android:textStyle="bold" />

        </LinearLayout>

    </androidx.appcompat.widget.Toolbar>

    <!-- Message Recycler View -->
    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/rvChatMessages"
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:clipToPadding="false"
        android:padding="12dp"
        app:layout_constraintBottom_toTopOf="@+id/chatInputContainer"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toBottomOf="@+id/chatToolbar" />

    <!-- Bottom Input Container -->
    <LinearLayout
        android:id="@+id/chatInputContainer"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:background="@color/colorSurfaceDark"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:padding="8dp"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent">

        <ImageButton
            android:id="@+id/btnVoiceInput"
            android:layout_width="44dp"
            android:layout_height="44dp"
            android:background="@drawable/bg_circle_button"
            android:src="@drawable/ic_mic"
            app:tint="@color/colorGold" />

        <EditText
            android:id="@+id/etMessageInput"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginStart="8dp"
            android:layout_marginEnd="8dp"
            android:layout_weight="1"
            android:hint="@string/hint_type_tigrinya_message"
            android:textColor="@color/colorTextPrimary"
            android:textSize="14sp" />

        <com.google.android.material.floatingactionbutton.FloatingActionButton
            android:id="@+id/btnSendMessage"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:src="@drawable/ic_send"
            app:backgroundTint="@color/colorGold"
            app:fabCustomSize="44dp"
            app:tint="@color/colorTextDark" />

    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>`
  },
  {
    path: 'app/src/main/res/layout/activity_camera_ocr.xml',
    name: 'activity_camera_ocr.xml',
    category: 'layout',
    language: 'xml',
    description: 'XML layout for camera viewfinder, golden laser overlay, and OCR recognition card.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/colorBackgroundDark">

    <androidx.appcompat.widget.Toolbar
        android:id="@+id/ocrToolbar"
        android:layout_width="0dp"
        android:layout_height="?attr/actionBarSize"
        android:background="@color/colorSurfaceDark"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="@string/ocr_screen_title"
            android:textColor="@color/colorGold"
            android:textSize="16sp"
            android:textStyle="bold" />

    </androidx.appcompat.widget.Toolbar>

    <FrameLayout
        android:id="@+id/cameraPreviewFrame"
        android:layout_width="0dp"
        android:layout_height="0dp"
        app:layout_constraintBottom_toTopOf="@+id/ocrBottomPanel"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toBottomOf="@+id/ocrToolbar">

        <View
            android:id="@+id/viewReticle"
            android:layout_width="280dp"
            android:layout_height="220dp"
            android:layout_gravity="center"
            android:background="@drawable/bg_ocr_viewfinder" />

    </FrameLayout>

    <LinearLayout
        android:id="@+id/ocrBottomPanel"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:background="@color/colorSurfaceDark"
        android:orientation="vertical"
        android:padding="16dp"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent">

        <com.google.android.material.floatingactionbutton.FloatingActionButton
            android:id="@+id/btnCaptureOcr"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="center"
            android:src="@drawable/ic_camera_scan"
            app:backgroundTint="@color/colorGold"
            app:tint="@color/colorTextDark" />

    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>`
  },
  {
    path: 'app/src/main/res/layout/activity_telebirr.xml',
    name: 'activity_telebirr.xml',
    category: 'layout',
    language: 'xml',
    description: 'XML layout for mobile money wallet card, balance display, and instant payment form.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<androidx.coordinatorlayout.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/colorBackgroundDark">

    <com.google.android.material.appbar.AppBarLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="@color/colorSurfaceDark">

        <androidx.appcompat.widget.Toolbar
            android:id="@+id/telebirrToolbar"
            android:layout_width="match_parent"
            android:layout_height="?attr/actionBarSize">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="@string/telebirr_screen_title"
                android:textColor="@color/colorGold"
                android:textSize="16sp"
                android:textStyle="bold" />

        </androidx.appcompat.widget.Toolbar>

    </com.google.android.material.appbar.AppBarLayout>

</androidx.coordinatorlayout.widget.CoordinatorLayout>`
  },

  // ==========================================
  // Values & Manifest & Gradle
  // ==========================================
  {
    path: 'app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    category: 'manifest',
    language: 'xml',
    description: 'Android Manifest defining permissions (OneSignal Push, Microphone, Camera, Biometric, Internet) & Activities in Java.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.axumite.ai">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />

    <application
        android:name=".AxumiteApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.AxumiteAI">

        <activity
            android:name=".SplashActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:theme="@style/Theme.AxumiteAI">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:windowSoftInputMode="adjustResize" />

        <activity android:name=".ObeliskChatActivity" android:exported="false" />
        <activity android:name=".GeezCameraOcrActivity" android:exported="false" />
        <activity android:name=".TelebirrPaymentActivity" android:exported="false" />
        <activity android:name=".TigrinyaDictionaryActivity" android:exported="false" />
        <activity android:name=".SystemDiagnosticsActivity" android:exported="false" />

    </application>

</manifest>`
  },
  {
    path: 'app/google-services.json',
    name: 'google-services.json',
    category: 'manifest',
    language: 'xml',
    description: 'Firebase Android Configuration File linked to Project axumite-ai (Package: com.axumite.ai).',
    content: `{
  "project_info": {
    "project_number": "193452450066",
    "project_id": "axumite-ai",
    "storage_bucket": "axumite-ai.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:193452450066:android:45f28d2c0bbd21981f93cb",
        "android_client_info": {
          "package_name": "com.axumite.ai"
        }
      },
      "oauth_client": [],
      "api_key": [
        {
          "current_key": "AIzaSyDUR9nFYUZp688G8pfyecJcRNuCUR9VCLA"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        }
      }
    }
  ],
  "configuration_version": "1"
}`
  },
  {
    path: 'app/build.gradle',
    name: 'app/build.gradle',
    category: 'gradle',
    language: 'groovy',
    description: 'Gradle Build Script configuring Java 17 compile options, Target SDK 35, OneSignal Push, and dependencies.',
    content: `plugins {
    id 'com.android.application'
    id 'com.google.gms.google-services'
}

android {
    namespace 'com.axumite.ai'
    compileSdk 35

    defaultConfig {
        applicationId "com.axumite.ai"
        minSdk 26
        targetSdk 35
        versionCode 1
        versionName "1.0.0"
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    buildFeatures {
        viewBinding true
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.7.0'
    implementation 'com.google.android.material:material:1.12.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'androidx.recyclerview:recyclerview:1.3.2'
    implementation 'androidx.camera:camera-core:1.3.4'
    implementation 'androidx.biometric:biometric:1.2.0-alpha05'

    // OneSignal Push Notification SDK (v5.x)
    implementation 'com.onesignal:OneSignal:[5.0.0, 5.99.99]'

    // Firebase Android SDK (Import the Firebase BoM)
    implementation platform('com.google.firebase:firebase-bom:33.7.0')
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-firestore'
    implementation 'com.google.firebase:firebase-auth'
}`
  },
  {
    path: 'app/src/main/res/values/strings.xml',
    name: 'strings.xml',
    category: 'manifest',
    language: 'xml',
    description: 'Android string resources containing Ge\'ez and Tigrinya titles, action labels, and splash screen metadata.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">ኣክሱማይት AI</string>
    <string name="app_name_en">Axumite AI Sovereign</string>
    <string name="toggle_language">Switch Language</string>
    <string name="title_diagnostics">System Diagnostics</string>
    
    <!-- Hero Banner -->
    <string name="hero_banner_title">ኦበሊስክ AI • ባንክን ባህልን</string>
    <string name="hero_banner_subtitle">Native Android flagship intelligence with offline Ge\\'ez OCR, Tigrinya speech processing, and secure Telebirr integration.</string>
    <string name="action_start_voice">Start Tigrinya Voice Chat</string>
    
    <!-- Modules -->
    <string name="section_native_modules">Native Axumite Modules</string>
    <string name="module_chat_title">Obelisk AI Chat</string>
    <string name="module_chat_desc">Conversational Tigrinya LLM</string>
    
    <string name="module_ocr_title">Ge\\'ez Camera OCR</string>
    <string name="module_ocr_desc">Manuscript &amp; Stela Reader</string>
    
    <string name="module_telebirr_title">Telebirr Wallet</string>
    <string name="module_telebirr_desc">Instant Mobile Payments</string>
    
    <string name="module_dict_title">Heritage Lexicon</string>
    <string name="module_dict_desc">Ge\\'ez-Tigrinya Dictionary</string>
    
    <!-- Chat Screen -->
    <string name="chat_screen_title">Obelisk Sovereign Chat</string>
    <string name="hint_type_tigrinya_message">ትግርኛ ወይ ድማ ሕቶኹም ኣብዚ ጸሓፉ...</string>
    <string name="action_send">Send</string>
    <string name="action_voice_input">Voice Input</string>
    <string name="action_back">Back</string>
    <string name="action_clear_chat">Clear History</string>
    
    <!-- OCR Screen -->
    <string name="ocr_screen_title">Ge\\'ez Inscription Scanner</string>
    <string name="action_flash">Toggle Flashlight</string>
    <string name="action_capture_ocr">Capture Inscription</string>
    
    <!-- Telebirr Screen -->
    <string name="telebirr_screen_title">Telebirr Native Bridge</string>
    
    <!-- Dictionary Screen -->
    <string name="dict_screen_title">Heritage Dictionary</string>
    
    <!-- Splash Screen -->
    <string name="splash_motto">Sovereign Artificial Intelligence for Horn of Africa</string>
    <string name="splash_loading">Initializing Axumite Neural Engines &amp; KeyStore...</string>
    <string name="splash_loading_ti">ኦበሊስክ AI ንባዮሜትሪክን ይዳሎ ኣሎ...</string>
    <string name="splash_footer">Android 15 (API 35) • StrongBox TEE • Java 17</string>
</resources>`
  },
  {
    path: 'app/src/main/res/values/colors.xml',
    name: 'colors.xml',
    category: 'manifest',
    language: 'xml',
    description: 'Axumite Imperial palette color resource definitions (Axum Gold, Obelisk Dark, Emerald, Obsidian).',
    content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorBackgroundDark">#0B0814</color>
    <color name="colorSurfaceDark">#120E1F</color>
    <color name="colorSurfaceCard">#171228</color>
    <color name="colorGold">#C5A059</color>
    <color name="colorGoldLight">#F3E5AB</color>
    <color name="colorEmerald">#10B981</color>
    <color name="colorTextPrimary">#F8FAFC</color>
    <color name="colorTextSecondary">#94A3B8</color>
    <color name="colorBorderDark">#241A3E</color>
</resources>`
  }
];
