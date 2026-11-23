package com.axumite.ai.service;

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
     * Sets user segmentation tags for targeted notification campaigns (e.g. Ge'ez scholars, language preference).
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
     * Authenticates user ID with OneSignal backend (e.g. Firebase Auth UID or Telebirr Phone).
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
     * Updates user tags in OneSignal to register custom notification icon styles per category.
     * This allows the OneSignal server-side notification dispatcher to target the exact drawable resource.
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
        // Fallback default imperial obelisk icon
        return "ic_stat_onesignal_obelisk_gold";
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
}
