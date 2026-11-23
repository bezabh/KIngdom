package com.axumite.ai.auth

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt

sealed class BiometricStatus {
    data object Ready : BiometricStatus()
    data object HardwareUnavailable : BiometricStatus()
    data object NoBiometricsEnrolled : BiometricStatus()
    data object Unsupported : BiometricStatus()
}

sealed class AuthResult {
    data class Success(val cryptoObject: BiometricPrompt.CryptoObject? = null) : AuthResult()
    data class Error(val errorCode: Int, val errString: CharSequence, val localizedTigrinya: String) : AuthResult()
    data object Failed : AuthResult()
}

interface BiometricAuthCallback {
    fun onAuthResult(result: AuthResult)
}

/**
 * Enterprise-grade Biometric Authentication Manager for Axumite AI Telebirr & Private Vaults.
 */
class BiometricAuthManager(
    private val context: Context,
    private val biometricManager: BiometricManager = BiometricManager.from(context)
) {
    fun checkBiometricAvailability(): BiometricStatus {
        return when (biometricManager.canAuthenticate(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)) {
            BiometricManager.BIOMETRIC_SUCCESS -> BiometricStatus.Ready
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> BiometricStatus.HardwareUnavailable
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> BiometricStatus.HardwareUnavailable
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> BiometricStatus.NoBiometricsEnrolled
            else -> BiometricStatus.Unsupported
        }
    }
}