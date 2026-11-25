package com.axumite.ai

import android.content.Context
import android.util.Log
import com.google.android.libraries.ads.mobile.sdk.MobileAds
import com.google.android.libraries.ads.mobile.sdk.initialization.InitializationConfig
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Dedicated initializer for the Google Mobile Ads (GMA) Next-Gen SDK.
 * Initializes MobileAds asynchronously on a background thread using the
 * programmatic InitializationConfig API and sample App ID.
 */
class AdMobInitializer(
    private val backgroundScope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
) {

    fun initialize(context: Context) {
        if (isInitCalled.getAndSet(true)) return

        val appContext = context.applicationContext ?: context
        backgroundScope.launch(Dispatchers.IO) {
            try {
                val initConfig = InitializationConfig.Builder(ADMOB_APP_ID).build()
                MobileAds.initialize(appContext, initConfig) { initializationStatus ->
                    Log.i(TAG, "GMA Next-Gen MobileAds initialized: $initializationStatus")
                    if (!initDeferred.isCompleted) {
                        initDeferred.complete(true)
                    }
                }
            } catch (t: Throwable) {
                Log.e(TAG, "Failed to initialize GMA Next-Gen MobileAds SDK", t)
                if (!initDeferred.isCompleted) {
                    initDeferred.complete(false)
                }
            }
        }
    }

    suspend fun awaitInitialized(): Boolean = awaitInitialization()

    companion object {
        private const val TAG = "AdMobInitializer"
        const val ADMOB_APP_ID = "ca-app-pub-3940256099942544~3347511713"

        private val isInitCalled = AtomicBoolean(false)
        private val initDeferred = CompletableDeferred<Boolean>()

        suspend fun awaitInitialization(): Boolean {
            if (!isInitCalled.get()) return false
            return withTimeoutOrNull(15_000L) {
                initDeferred.await()
            } ?: false
        }
    }
}
