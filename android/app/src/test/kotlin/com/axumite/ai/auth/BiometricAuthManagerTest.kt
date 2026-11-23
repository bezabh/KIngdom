package com.axumite.ai.auth

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class BiometricAuthManagerTest {

    private lateinit var mockBiometricManager: BiometricManager
    private lateinit var authManager: BiometricAuthManager
    private val mockContext = mockk<android.content.Context>(relaxed = true)

    @Before
    fun setUp() {
        mockBiometricManager = mockk()
        authManager = BiometricAuthManager(mockContext, mockBiometricManager)
    }

    @Test
    fun testCheckBiometricAvailability_whenHardwareAndEnrolled_returnsReady() {
        every { 
            mockBiometricManager.canAuthenticate(BIOMETRIC_STRONG or DEVICE_CREDENTIAL) 
        } returns BiometricManager.BIOMETRIC_SUCCESS

        val status = authManager.checkBiometricAvailability()
        assertEquals(BiometricStatus.Ready, status)
    }

    @Test
    fun testCheckBiometricAvailability_whenNoHardware_returnsHardwareUnavailable() {
        every { 
            mockBiometricManager.canAuthenticate(BIOMETRIC_STRONG or DEVICE_CREDENTIAL) 
        } returns BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE

        val status = authManager.checkBiometricAvailability()
        assertEquals(BiometricStatus.HardwareUnavailable, status)
    }
}