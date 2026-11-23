package com.axumite.ai.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.axumite.ai.ui.theme.GoldPrimary
import com.axumite.ai.ui.theme.RoyalDarkSurface

data class ChatMessage(val id: String, val sender: Sender, val text: String, val time: String)
enum class Sender { USER, AI }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(navController: NavController) {
    var inputText by remember { mutableStateOf("") }
    val messages = remember {
        mutableStateListOf(
            ChatMessage("1", Sender.AI, "ሰላም! ኣነ ኦበሊስክ AI እየ። ብትግርኛ ወይ ብግእዝ እንታይ ክሕግዘኩም ትደልዩ?", "10:00 AM")
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ኦበሊስክ AI • Obelisk Chat", fontWeight = FontWeight.Bold, color = GoldPrimary) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = RoyalDarkSurface)
            )
        },
        bottomBar = {
            Surface(color = RoyalDarkSurface, tonalElevation = 8.dp) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    TextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        placeholder = { Text("ብትግርኛ ሕቶኹም ጸሓፉ...") },
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(20.dp)),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color(0xFF1E1638),
                            unfocusedContainerColor = Color(0xFF1E1638),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                    IconButton(
                        onClick = {
                            if (inputText.isNotBlank()) {
                                messages.add(ChatMessage(System.currentTimeMillis().toString(), Sender.USER, inputText, "Just now"))
                                val reply = "ብዛዕባ "${inputText}" ዝሓተትኩምዎ ብትግርኛ ተረዲኡኒ ኣሎ።"
                                messages.add(ChatMessage((System.currentTimeMillis() + 1).toString(), Sender.AI, reply, "Just now"))
                                inputText = ""
                            }
                        },
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(GoldPrimary)
                    ) {
                        Icon(Icons.Default.Send, contentDescription = "Send", tint = Color.Black)
                    }
                }
            }
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(messages) { msg ->
                val isUser = msg.sender == Sender.USER
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (isUser) GoldPrimary else Color(0xFF1B1430))
                            .padding(12.dp)
                    ) {
                        Text(
                            text = msg.text,
                            color = if (isUser) Color.Black else Color.White,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
    }
}