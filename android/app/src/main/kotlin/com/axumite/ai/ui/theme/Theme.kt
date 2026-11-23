package com.axumite.ai.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val GoldPrimary = Color(0xFFF3E5AB)
val GoldSecondary = Color(0xFFC5A059)
val RoyalDarkSurface = Color(0xFF0D081E)
val RoyalDarkBackground = Color(0xFF070412)
val EmeraldSuccess = Color(0xFF10B981)

private val DarkColorScheme = darkColorScheme(
    primary = GoldPrimary,
    secondary = GoldSecondary,
    tertiary = Color(0xFFE2D4F0),
    background = RoyalDarkBackground,
    surface = RoyalDarkSurface,
    onPrimary = Color.Black,
    onSecondary = Color.Black,
    onBackground = Color.White,
    onSurface = Color.White
)

@Composable
fun AxumiteTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}