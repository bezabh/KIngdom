package com.axumite.ai

import android.app.Application
import android.util.Log
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel

class AxumiteApplication : Application() {

    private val adMobInitializer by lazy { AdMobInitializer() }

    override fun onCreate() {
        super.onCreate()
        instance = this
        Log.i(TAG, "Axumite AI Sovereign Android App (Kotlin 2.0 / Jetpack Compose) initialized.")

        initOneSignal()
        adMobInitializer.initialize(this)
    }

    private fun initOneSignal() {
        try {
            OneSignal.Debug.logLevel = LogLevel.VERBOSE
            OneSignal.initWithContext(this, ONESIGNAL_APP_ID)
            OneSignal.Notifications.requestPermission(true)
            
            // Sync user tags for Ge'ez OCR & Tigrinya Push Segments
            OneSignal.User.addTags(
                mapOf(
                    "language" to "ti",
                    "sovereign_tier" to "sovereign_pro",
                    "app_build" to "3.8.2_kotlin"
                )
            )
            Log.i(TAG, "OneSignal initialized successfully.")
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing OneSignal SDK", e)
        }
    }

    companion object {
        private const val TAG = "AxumiteApp"
        const val ONESIGNAL_APP_ID = "122b150b-1b50-4200-b515-7da4ed438c4e"
        lateinit var instance: AxumiteApplication
            private set
    }
}