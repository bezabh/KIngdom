package com.axumite.ai.util

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.HapticFeedbackConstants
import android.view.View
import android.webkit.JavascriptInterface
import org.json.JSONArray

/**
 * Native Android Vibration API & HapticFeedbackConstants Engine for Axumite AI.
 * Supports direct Kotlin/Compose calls as well as WebView JS bridge exposure
 * (`window.AxumiteAndroidHaptics`) for BottomNav tactile 'thud' feedback,
 * swipe gestures, and tab transitions.
 */
object HapticFeedbackHelper {

    /**
     * Weighted luxury-gold BottomNav tactile 'thud' vibration waveform
     * (delay 0ms, crisp latch 18ms, damp 14ms, resonant gold strike 34ms).
     */
    val VIBRATE_PATTERN: LongArray = longArrayOf(0L, 18L, 14L, 34L)
    val VIBRATE_AMPLITUDES: IntArray = intArrayOf(0, 145, 0, 235)

    /**
     * Elevated center primary action button authoritative 'thud'.
     */
    val VIBRATE_PATTERN_PRIMARY: LongArray = longArrayOf(0L, 22L, 16L, 42L)
    val VIBRATE_AMPLITUDES_PRIMARY: IntArray = intArrayOf(0, 165, 0, 255)

    private fun resolveVibrator(context: Context): Vibrator? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            manager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    /**
     * Combines Android `HapticFeedbackConstants.LONG_PRESS` with `VIBRATE_PATTERN`
     * amplitude-shaped waveform for a deep, luxury tactile 'thud' on BottomNav tab switches.
     */
    fun triggerBottomNavLuxuryThud(
        context: Context,
        view: View? = null,
        feedbackConstant: Int = HapticFeedbackConstants.LONG_PRESS,
        pattern: LongArray = VIBRATE_PATTERN,
        isPrimaryAction: Boolean = false
    ) {
        view?.performHapticFeedback(
            feedbackConstant,
            HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING
        )
        val timings = if (isPrimaryAction) VIBRATE_PATTERN_PRIMARY else pattern
        val amplitudes = if (isPrimaryAction) {
            VIBRATE_AMPLITUDES_PRIMARY
        } else if (timings.size == VIBRATE_AMPLITUDES.size) {
            VIBRATE_AMPLITUDES
        } else {
            null
        }
        vibrateTimings(context, timings, amplitudes)
    }

    /**
     * Crisp micro-detent triggered when horizontal swipe drag crosses threshold.
     */
    fun triggerSwipeThreshold(context: Context) {
        vibrateTimings(context, longArrayOf(0L, 10L), intArrayOf(0, 120))
    }

    /**
     * Directional physical click-pulse waveform when switching tabs/screens.
     */
    fun triggerSwipeTransition(context: Context, isNextTab: Boolean = true) {
        val timings = if (isNextTab) longArrayOf(0L, 14L, 18L, 26L) else longArrayOf(0L, 24L, 16L, 12L)
        val amplitudes = if (isNextTab) intArrayOf(0, 110, 0, 185) else intArrayOf(0, 185, 0, 110)
        vibrateTimings(context, timings, amplitudes)
    }

    /**
     * Subtle tactile click for secondary tab taps and navigation controls.
     */
    fun triggerTabTap(context: Context) {
        vibrateTimings(context, longArrayOf(0L, 12L), intArrayOf(0, 130))
    }

    fun vibrateTimings(context: Context, timings: LongArray, amplitudes: IntArray? = null) {
        val vibrator = resolveVibrator(context) ?: return
        if (!vibrator.hasVibrator()) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val effect = if (amplitudes != null && vibrator.hasAmplitudeControl() && amplitudes.size == timings.size) {
                VibrationEffect.createWaveform(timings, amplitudes, -1)
            } else {
                VibrationEffect.createWaveform(timings, -1)
            }
            vibrator.vibrate(effect)
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(timings, -1)
        }
    }

    /**
     * WebView JavaScript Interface (`AxumiteAndroidHaptics`) for hybrid web/Android execution.
     */
    class WebViewHapticBridge(
        private val context: Context,
        private val hostView: View? = null
    ) {
        @JavascriptInterface
        fun performHapticFeedback(feedbackConstant: Int) {
            val view = hostView
            if (view != null) {
                view.post {
                    view.performHapticFeedback(
                        feedbackConstant,
                        HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING
                    )
                }
            } else {
                vibrateTimings(context, VIBRATE_PATTERN, VIBRATE_AMPLITUDES)
            }
        }

        @JavascriptInterface
        fun triggerBottomNavThud(feedbackConstant: Int, patternJson: String) {
            hostView?.post {
                hostView.performHapticFeedback(
                    feedbackConstant,
                    HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING
                )
            }
            try {
                val arr = JSONArray(patternJson)
                val timings = LongArray(arr.length() + 1)
                val amplitudes = IntArray(arr.length() + 1)
                timings[0] = 0L
                amplitudes[0] = 0
                for (i in 0 until arr.length()) {
                    timings[i + 1] = arr.optLong(i, 18L).coerceIn(5L, 250L)
                    // Alternating strike amplitudes: crisp latch followed by weighted deep thud
                    amplitudes[i + 1] = if (i % 2 == 0) {
                        if (i == arr.length() - 1) 235 else 150
                    } else {
                        0
                    }
                }
                vibrateTimings(context, timings, amplitudes)
            } catch (_: Exception) {
                triggerBottomNavLuxuryThud(context, hostView, feedbackConstant, VIBRATE_PATTERN)
            }
        }

        @JavascriptInterface
        fun vibratePattern(patternJson: String) {
            try {
                val arr = JSONArray(patternJson)
                val timings = LongArray(arr.length() + 1)
                timings[0] = 0L
                for (i in 0 until arr.length()) {
                    timings[i + 1] = arr.optLong(i, 12L).coerceIn(5L, 250L)
                }
                vibrateTimings(context, timings)
            } catch (_: Exception) {
                triggerTabTap(context)
            }
        }
    }
}
