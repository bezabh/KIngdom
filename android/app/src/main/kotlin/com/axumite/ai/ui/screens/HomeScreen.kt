package com.axumite.ai.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.axumite.ai.ui.navigation.Screen
import com.axumite.ai.ui.theme.GoldPrimary
import com.axumite.ai.ui.theme.GoldSecondary
import com.axumite.ai.ui.theme.RoyalDarkSurface

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(navController: NavController) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "AXUMITE AI",
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp,
                            color = GoldPrimary
                        )
                        Text(
                            text = "ልዑላዊ ናይ ትግርኛን ግእዝን መድረኽ",
                            fontSize = 11.sp,
                            color = Color.LightGray
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { navController.navigate(Screen.Diagnostics.route) }) {
                        Icon(Icons.Default.Build, contentDescription = "Diagnostics", tint = GoldPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = RoyalDarkSurface)
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(4.dp))
                SovereignHeroCard(navController)
            }

            item {
                Text(
                    text = "ቀንዲ መሳርሒታት • Sovereign Tools",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = GoldSecondary
                )
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    FeatureGridCard(
                        title = "ኦበሊስክ AI",
                        subtitle = "Tigrinya Chat",
                        icon = Icons.Default.Chat,
                        modifier = Modifier.weight(1f),
                        onClick = { navController.navigate(Screen.Chat.route) }
                    )
                    FeatureGridCard(
                        title = "ካሜራ ስካነር",
                        subtitle = "Ge'ez Vision OCR",
                        icon = Icons.Default.CameraAlt,
                        modifier = Modifier.weight(1f),
                        onClick = { navController.navigate(Screen.CameraOcr.route) }
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    FeatureGridCard(
                        title = "ቴሌብር & ዋሌት",
                        subtitle = "Mobile Money",
                        icon = Icons.Default.AccountBalanceWallet,
                        modifier = Modifier.weight(1f),
                        onClick = { navController.navigate(Screen.Telebirr.route) }
                    )
                    FeatureGridCard(
                        title = "መዝገበ ቃላት",
                        subtitle = "Offline Lexicon",
                        icon = Icons.Default.MenuBook,
                        modifier = Modifier.weight(1f),
                        onClick = { navController.navigate(Screen.Dictionary.route) }
                    )
                }
            }
        }
    }
}

@Composable
fun SovereignHeroCard(navController: NavController) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp)),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1538)),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = Brush.horizontalGradient(listOf(GoldPrimary, GoldSecondary)),
            width = 1.dp
        )
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.Star, contentDescription = null, tint = GoldPrimary)
                Text(
                    text = "ልዑላዊ ትግርኛ ሞዴል 3.8.2",
                    color = GoldPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }
            Text(
                text = "ናይ ግእዝን ትግርኛን ጥንታዊ ጽሑፋት ብዘመናዊ AI ተርጉሙን መርምሩን።",
                color = Color.White,
                fontSize = 15.sp,
                lineHeight = 22.sp
            )
            Button(
                onClick = { navController.navigate(Screen.Chat.route) },
                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary)
            ) {
                Text(text = "ሕጂ ጀምር • Start Exploring", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun FeatureGridCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Color(0xFF151028)),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = Brush.linearGradient(listOf(GoldPrimary.copy(alpha = 0.5f), Color.Transparent))
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF261D44)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = title, tint = GoldPrimary, modifier = Modifier.size(24.dp))
            }
            Column {
                Text(text = title, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                Text(text = subtitle, fontSize = 11.sp, color = Color.LightGray)
            }
        }
    }
}