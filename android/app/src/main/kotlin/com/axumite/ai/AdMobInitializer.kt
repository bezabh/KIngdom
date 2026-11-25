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
 * Singleton initializer for the Google Mobile Ads (GMA) Next-Gen SDK.
 * Invoked once during [AxumiteApplication.onCreate] so initialization runs
 * strictly once and on a background thread using the programmatic InitializationConfig API.
 */
object AdMobInitializer {

    private const val TAG = "AdMobInitializer"
    const val ADMOB_APP_ID = "ca-app-pub-3940256099942544~3347511713"

    private val backgroundScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val isInitCalled = AtomicBoolean(false)
    private val initDeferred = CompletableDeferred<Boolean>()

    fun initialize(context: Context) {
        if (!isInitCalled.compareAndSet(false, true)) return

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

    suspend fun awaitInitialization(): Boolean {
        if (!isInitCalled.get()) return false
        return withTimeoutOrNull(15_000L) {
            initDeferred.await()
        } ?: false
    }
}
