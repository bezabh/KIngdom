package com.axumite.ai.ui.navigation

import android.view.HapticFeedbackConstants
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.axumite.ai.ui.screens.*
import com.axumite.ai.util.HapticFeedbackHelper

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
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    var lastRoute by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(navBackStackEntry?.destination?.route) {
        val currentRoute = navBackStackEntry?.destination?.route
        if (lastRoute != null && currentRoute != null && lastRoute != currentRoute) {
            HapticFeedbackHelper.triggerBottomNavLuxuryThud(
                context = context,
                view = view,
                feedbackConstant = HapticFeedbackConstants.LONG_PRESS,
                pattern = HapticFeedbackHelper.VIBRATE_PATTERN
            )
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