package com.axumite.ai.ui.navigation

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.util.Log
import android.view.HapticFeedbackConstants
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.platform.LocalView
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.axumite.ai.AdMobInitializer
import com.axumite.ai.ui.screens.*
import com.axumite.ai.util.HapticFeedbackHelper
import com.google.android.libraries.ads.mobile.sdk.common.AdLoadCallback
import com.google.android.libraries.ads.mobile.sdk.common.AdRequest
import com.google.android.libraries.ads.mobile.sdk.common.FullScreenContentError
import com.google.android.libraries.ads.mobile.sdk.common.LoadAdError
import com.google.android.libraries.ads.mobile.sdk.interstitial.InterstitialAd
import com.google.android.libraries.ads.mobile.sdk.interstitial.InterstitialAdEventCallback
import kotlinx.coroutines.launch

private const val INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"
private const val INTERSTITIAL_COOLDOWN_MS = 60_000L

sealed class Screen(val route: String, val titleTi: String, val titleEn: String) {
    data object Home : Screen("home", "ዋና ገጽ", "Home")
    data object Chat : Screen("chat", "ኦበሊስክ AI", "Obelisk Chat")
    data object CameraOcr : Screen("camera_ocr", "ካሜራ ስካነር", "Ge'ez OCR")
    data object Telebirr : Screen("telebirr", "ቴሌብር ዋሌት", "Telebirr")
    data object Dictionary : Screen("dictionary", "መዝገበ ቃላት", "Dictionary")
    data object VoiceAssistant : Screen("voice", "ናይ ድምጺ ሓጋዚ", "Voice AI")
    data object BiometricVerification : Screen("biometric_verification", "ባዮሜትሪክ ምርመራ", "Biometric Lock")
    data object Diagnostics : Screen("diagnostics", "መርመራ", "Diagnostics")
}

@Composable
fun AxumiteNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier,
    startDestination: String = Screen.Home.route
) {
    val context = LocalContext.current
    val view = LocalView.current
    val isPreview = LocalInspectionMode.current
    val coroutineScope = rememberCoroutineScope()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    var lastRoute by remember { mutableStateOf<String?>(null) }

    var interstitialAd by remember { mutableStateOf<InterstitialAd?>(null) }
    var isLoadingInterstitial by remember { mutableStateOf(false) }
    var lastInterstitialShownAtMs by remember { mutableLongStateOf(0L) }

    fun loadInterstitialIfNeeded() {
        if (isPreview || interstitialAd != null || isLoadingInterstitial) return
        isLoadingInterstitial = true
        try {
            InterstitialAd.load(
                AdRequest.Builder(INTERSTITIAL_AD_UNIT_ID).build(),
                object : AdLoadCallback<InterstitialAd> {
                    override fun onAdLoaded(ad: InterstitialAd) {
                        isLoadingInterstitial = false
                        interstitialAd = ad
                        Log.d("AxumiteInterstitial", "Interstitial ad loaded.")
                    }

                    override fun onAdFailedToLoad(adError: LoadAdError) {
                        isLoadingInterstitial = false
                        interstitialAd = null
                        Log.w("AxumiteInterstitial", "Interstitial ad failed to load: ${adError.message}")
                    }
                }
            )
        } catch (t: Throwable) {
            isLoadingInterstitial = false
            interstitialAd = null
            Log.w("AxumiteInterstitial", "Unable to request interstitial ad", t)
        }
    }

    LaunchedEffect(Unit) {
        if (!isPreview && AdMobInitializer.awaitInitialization()) {
            loadInterstitialIfNeeded()
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            interstitialAd?.adEventCallback = null
            interstitialAd = null
        }
    }

    LaunchedEffect(navBackStackEntry?.destination?.route) {
        val currentRoute = navBackStackEntry?.destination?.route
        val previousRoute = lastRoute
        if (previousRoute != null && currentRoute != null && previousRoute != currentRoute) {
            HapticFeedbackHelper.triggerBottomNavLuxuryThud(
                context = context,
                view = view,
                feedbackConstant = HapticFeedbackConstants.LONG_PRESS,
                pattern = HapticFeedbackHelper.VIBRATE_PATTERN
            )

            // Natural transition point: returning to Home from a feature screen (never on startup, never interrupting actions)
            val isNaturalReturnToHome =
                currentRoute == Screen.Home.route &&
                    previousRoute != Screen.BiometricVerification.route
            val now = System.currentTimeMillis()
            val cooldownElapsed = now - lastInterstitialShownAtMs >= INTERSTITIAL_COOLDOWN_MS
            val adToShow = interstitialAd
            val activity = context.findActivity()

            if (isNaturalReturnToHome && cooldownElapsed && adToShow != null && activity != null && !activity.isFinishing && !activity.isDestroyed) {
                interstitialAd = null
                adToShow.adEventCallback = object : InterstitialAdEventCallback {
                    override fun onAdShowedFullScreenContent() {
                        lastInterstitialShownAtMs = System.currentTimeMillis()
                        Log.d("AxumiteInterstitial", "Interstitial ad showed.")
                    }

                    override fun onAdDismissedFullScreenContent() {
                        Log.d("AxumiteInterstitial", "Interstitial ad dismissed.")
                        coroutineScope.launch {
                            if (AdMobInitializer.awaitInitialization()) {
                                loadInterstitialIfNeeded()
                            }
                        }
                    }

                    override fun onAdFailedToShowFullScreenContent(fullScreenContentError: FullScreenContentError) {
                        Log.w("AxumiteInterstitial", "Interstitial ad failed to show: ${fullScreenContentError.message}")
                    }
                }
                try {
                    adToShow.show(activity)
                } catch (t: Throwable) {
                    Log.w("AxumiteInterstitial", "Error showing interstitial ad", t)
                }
            }
        }
        lastRoute = currentRoute
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        composable(Screen.Home.route) {
            HomeScreen(navController = navController)
        }
        composable(Screen.Chat.route) {
            ChatScreen(navController = navController)
        }
        composable(Screen.CameraOcr.route) {
            CameraOcrScreen(navController = navController)
        }
        composable(Screen.Telebirr.route) {
            TelebirrScreen(navController = navController)
        }
        composable(Screen.Dictionary.route) {
            DictionaryScreen(navController = navController)
        }
        composable(Screen.VoiceAssistant.route) {
            VoiceAssistantScreen(navController = navController)
        }
        composable(Screen.BiometricVerification.route) {
            BiometricVerificationScreen(navController = navController)
        }
        composable(Screen.Diagnostics.route) {
            DiagnosticsScreen(navController = navController)
        }
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}