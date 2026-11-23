package com.axumite.ai.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.axumite.ai.ui.components.AxumiteCustomBiometricPrompt
import com.axumite.ai.ui.theme.GoldPrimary
import com.axumite.ai.ui.theme.RoyalDarkSurface

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TelebirrScreen(navController: NavController) {
    var balance by remember { mutableStateOf(4850.75) }
    var recipientPhone by remember { mutableStateOf("0911234567") }
    var amount by remember { mutableStateOf("250") }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var showBiometricAuth by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ቴሌብር & CBE Birr ዋሌት", fontWeight = FontWeight.Bold, color = GoldPrimary) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = RoyalDarkSurface)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Balance Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1B1336)),
                shape = RoundedCornerShape(20.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(text = "ናይ ቴሌብር ሒሳብኩም (Current Balance)", fontSize = 12.sp, color = Color.LightGray)
                    Text(
                        text = "ETB ${String.format("%.2f", balance)}",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        color = GoldPrimary
                    )
                }
            }

            // Transfer Form
            OutlinedTextField(
                value = recipientPhone,
                onValueChange = { recipientPhone = it },
                label = { Text("ናይ ተቐባሊ ቁጽሪ ስልኪ (Phone)") },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                label = { Text("መጠን ብር (Amount in ETB)") },
                modifier = Modifier.fillMaxWidth()
            )

            Button(
                onClick = {
                    showBiometricAuth = true
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(Icons.Default.Fingerprint, contentDescription = null, tint = Color.Black)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "ብባዮሜትሪክ ኣረጋጊጽካ ስደድ (Pay with Biometrics)",
                    color = Color.Black,
                    fontWeight = FontWeight.Bold
                )
            }

            statusMessage?.let {
                Text(text = it, color = Color(0xFF10B981), fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        }
    }

    // Bespoke Custom Axumite Biometric Prompt Dialog
    AxumiteCustomBiometricPrompt(
        isOpen = showBiometricAuth,
        title = "ምርግጋጽ ክፍሊት ቴሌብር",
        subtitle = "መጠን: ${amount} ETB ናብ ${recipientPhone}",
        description = "Hardware StrongBox TEE Cryptographic Authorization",
        onDismissRequest = { showBiometricAuth = false },
        onAuthenticationSuccess = {
            showBiometricAuth = false
            val amountVal = amount.toDoubleOrNull() ?: 0.0
            if (amountVal > 0 && amountVal <= balance) {
                balance -= amountVal
                statusMessage = "ክፍሊት ${amountVal} ETB ብባዮሜትሪክ ተረጋጊጹ ብዓወት ተላኢኹ ኣሎ!"
            }
        },
        onUsePinFallback = {
            showBiometricAuth = false
            val amountVal = amount.toDoubleOrNull() ?: 0.0
            if (amountVal > 0 && amountVal <= balance) {
                balance -= amountVal
                statusMessage = "ክፍሊት ${amountVal} ETB ብናይ ስልኪ ፒን ተረጋጊጹ ተላኢኹ ኣሎ!"
            }
        }
    )
}