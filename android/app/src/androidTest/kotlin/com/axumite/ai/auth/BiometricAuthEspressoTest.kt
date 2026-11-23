package com.axumite.ai.auth

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import com.axumite.ai.ui.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@LargeTest
class BiometricAuthEspressoTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun testCustomBiometricPrompt_whenTriggered_displaysAxumiteBrandingAndTigrinyaText() {
        // Navigate to Telebirr Wallet Screen
        composeTestRule.onNodeWithText("ቴሌብር & ዋሌት").performClick()

        // Trigger Biometric Verification Button
        composeTestRule.onNodeWithText("ብባዮሜትሪክ ኣረጋጊጽካ ስደድ (Pay with Biometrics)").performClick()

        // Assert Axumite Custom Prompt elements are displayed
        composeTestRule.onNodeWithText("STRONGBOX TEE").assertIsDisplayed()
        composeTestRule.onNodeWithText("ምርግጋጽ ክፍሊት ቴሌብር").assertIsDisplayed()
        composeTestRule.onNodeWithText("ናይ ስልኪ ፒን").assertIsDisplayed()
    }
}