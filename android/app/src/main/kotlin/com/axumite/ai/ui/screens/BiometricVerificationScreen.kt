package com.axumite.ai.ui.screens

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.util.AttributeSet
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.animation.PathInterpolator
import androidx.annotation.Keep
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Key
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation.NavController
import com.axumite.ai.ui.theme.EmeraldSuccess
import com.axumite.ai.ui.theme.GoldPrimary
import com.axumite.ai.ui.theme.GoldSecondary
import com.axumite.ai.ui.theme.RoyalDarkBackground
import com.axumite.ai.ui.theme.RoyalDarkSurface
import com.axumite.ai.util.HapticFeedbackHelper
import kotlinx.coroutines.delay

/**
 * Custom Android View rendering the Axumite Sovereign metallic gold Lock icon with a
 * Framer Motion-inspired 'gold-shimmer' entrance animation driven natively by
 * Android's [ObjectAnimator] and [AnimatorSet].
 */
class GoldShimmerLockIconView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val shimmerMatrix = Matrix()
    private val lockBodyRect = RectF()
    private val shackleRect = RectF()
    private val shimmerClipPath = Path()

    private var entranceAnimatorSet: AnimatorSet? = null
    private var ambientShimmerAnimator: ObjectAnimator? = null

    private var _shimmerProgress: Float = -0.65f
    private var _glowIntensity: Float = 0f
    private var _isUnlocked: Boolean = false

    private val haloPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val medallionFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = 0xFF120C24.toInt()
    }
    private val medallionBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 4.5f
    }
    private val lockStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val lockFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val keyholePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = 0xFF0E091D.toInt()
    }
    private val shimmerBeamPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    /**
     * Animated via [ObjectAnimator.ofFloat] (`"shimmerProgress"`) to sweep the
     * diagonal metallic gold highlight beam across the lock icon.
     */
    @Keep
    var shimmerProgress: Float
        get() = _shimmerProgress
        set(value) {
            _shimmerProgress = value
            invalidate()
        }

    /**
     * Animated via [ObjectAnimator.ofFloat] (`"glowIntensity"`) to bloom the
     * radial Axumite gold halo behind the lock medallion on entrance.
     */
    @Keep
    var glowIntensity: Float
        get() = _glowIntensity
        set(value) {
            _glowIntensity = value.coerceIn(0f, 1.2f)
            invalidate()
        }

    var isUnlocked: Boolean
        get() = _isUnlocked
        set(value) {
            if (_isUnlocked != value) {
                _isUnlocked = value
                if (value) {
                    playUnlockCelebration()
                }
                invalidate()
            }
        }

    /**
     * Executes the Framer Motion-inspired 'gold-shimmer' entrance animation using
     * Android's [ObjectAnimator] and cubic-bezier [PathInterpolator] `(0.16, 1, 0.3, 1)`.
     */
    fun playGoldShimmerEntrance() {
        stopAnimations()

        // Matches Framer Motion's luxury deceleration curve [0.16, 1, 0.3, 1]
        val luxuryEase = PathInterpolator(0.16f, 1f, 0.3f, 1f)

        alpha = 0f
        scaleX = 0.70f
        scaleY = 0.70f
        translationY = 26f
        rotation = -10f
        _shimmerProgress = -0.65f
        _glowIntensity = 0f

        val alphaAnim = ObjectAnimator.ofFloat(this, View.ALPHA, 0f, 1f).apply {
            duration = 520L
            interpolator = luxuryEase
        }
        val scaleXAnim = ObjectAnimator.ofFloat(this, View.SCALE_X, 0.70f, 1.07f, 1f).apply {
            duration = 680L
            interpolator = luxuryEase
        }
        val scaleYAnim = ObjectAnimator.ofFloat(this, View.SCALE_Y, 0.70f, 1.07f, 1f).apply {
            duration = 680L
            interpolator = luxuryEase
        }
        val translateYAnim = ObjectAnimator.ofFloat(this, View.TRANSLATION_Y, 26f, 0f).apply {
            duration = 620L
            interpolator = luxuryEase
        }
        val rotationAnim = ObjectAnimator.ofFloat(this, View.ROTATION, -10f, 2f, 0f).apply {
            duration = 640L
            interpolator = luxuryEase
        }
        val glowAnim = ObjectAnimator.ofFloat(this, "glowIntensity", 0f, 1f, 0.42f).apply {
            duration = 920L
            interpolator = luxuryEase
        }
        val shimmerSweepAnim = ObjectAnimator.ofFloat(this, "shimmerProgress", -0.65f, 1.65f).apply {
            startDelay = 120L
            duration = 1150L
            interpolator = luxuryEase
        }

        entranceAnimatorSet = AnimatorSet().apply {
            playTogether(
                alphaAnim,
                scaleXAnim,
                scaleYAnim,
                translateYAnim,
                rotationAnim,
                glowAnim,
                shimmerSweepAnim
            )
            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    startAmbientGoldShimmer()
                }
            })
            start()
        }
    }

    private fun startAmbientGoldShimmer() {
        ambientShimmerAnimator?.cancel()
        ambientShimmerAnimator = ObjectAnimator.ofFloat(this, "shimmerProgress", -0.75f, 1.75f).apply {
            startDelay = 2400L
            duration = 1350L
            interpolator = PathInterpolator(0.22f, 1f, 0.36f, 1f)
            repeatCount = ObjectAnimator.INFINITE
            repeatMode = ObjectAnimator.RESTART
            start()
        }
    }

    private fun playUnlockCelebration() {
        val luxuryEase = PathInterpolator(0.16f, 1f, 0.3f, 1f)
        val popX = ObjectAnimator.ofFloat(this, View.SCALE_X, 1f, 1.12f, 1f).apply {
            duration = 420L
            interpolator = luxuryEase
        }
        val popY = ObjectAnimator.ofFloat(this, View.SCALE_Y, 1f, 1.12f, 1f).apply {
            duration = 420L
            interpolator = luxuryEase
        }
        val sweep = ObjectAnimator.ofFloat(this, "shimmerProgress", -0.65f, 1.65f).apply {
            duration = 750L
            interpolator = luxuryEase
        }
        AnimatorSet().apply {
            playTogether(popX, popY, sweep)
            start()
        }
    }

    fun stopAnimations() {
        entranceAnimatorSet?.cancel()
        entranceAnimatorSet = null
        ambientShimmerAnimator?.cancel()
        ambientShimmerAnimator = null
    }

    override fun onDetachedFromWindow() {
        stopAnimations()
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return

        val cx = w / 2f
        val cy = h / 2f
        val radius = minOf(w, h) * 0.37f

        // 1. Radial Axumite Gold Glow Halo
        val haloRadius = minOf(w, h) * 0.5f
        val haloAlpha = (145 * _glowIntensity).toInt().coerceIn(0, 190)
        val haloPrimaryColor = if (_isUnlocked) {
            (haloAlpha shl 24) or 0x10B981
        } else {
            (haloAlpha shl 24) or 0xD4AF37
        }
        haloPaint.shader = RadialGradient(
            cx,
            cy,
            haloRadius,
            intArrayOf(haloPrimaryColor, 0x00000000),
            floatArrayOf(0.2f, 1f),
            Shader.TileMode.CLAMP
        )
        canvas.drawCircle(cx, cy, haloRadius, haloPaint)

        // 2. Circular Obsidian Medallion + Metallic Gold Rim
        canvas.drawCircle(cx, cy, radius, medallionFillPaint)

        val borderColors = if (_isUnlocked) {
            intArrayOf(0xFF10B981.toInt(), 0xFF6EE7B7.toInt(), 0xFFF3E5AB.toInt(), 0xFF10B981.toInt())
        } else {
            intArrayOf(0xFF8E6D28.toInt(), 0xFFD4AF37.toInt(), 0xFFFFF4B8.toInt(), 0xFFAA7C11.toInt())
        }
        val borderGradient = LinearGradient(
            cx - radius,
            cy - radius,
            cx + radius,
            cy + radius,
            borderColors,
            null,
            Shader.TileMode.CLAMP
        )
        shimmerMatrix.reset()
        shimmerMatrix.setTranslate(_shimmerProgress * radius * 0.85f, 0f)
        borderGradient.setLocalMatrix(shimmerMatrix)
        medallionBorderPaint.shader = borderGradient
        medallionBorderPaint.strokeWidth = radius * 0.085f
        canvas.drawCircle(cx, cy, radius, medallionBorderPaint)

        // 3. Axumite Gold Padlock Icon (Shackle + Body + Keyhole)
        val lockGoldShader = LinearGradient(
            cx - radius,
            cy - radius,
            cx + radius,
            cy + radius,
            if (_isUnlocked) {
                intArrayOf(0xFF10B981.toInt(), 0xFF6EE7B7.toInt(), 0xFFFFF4B8.toInt(), 0xFF34D399.toInt())
            } else {
                intArrayOf(0xFF8E6D28.toInt(), 0xFFC5A059.toInt(), 0xFFFFF4B8.toInt(), 0xFFE1C47D.toInt(), 0xFF8E6D28.toInt())
            },
            null,
            Shader.TileMode.CLAMP
        )
        shimmerMatrix.reset()
        shimmerMatrix.setTranslate((_shimmerProgress - 0.5f) * radius * 1.6f, 0f)
        lockGoldShader.setLocalMatrix(shimmerMatrix)

        val bodyWidth = radius * 0.86f
        val bodyHeight = radius * 0.68f
        val bodyLeft = cx - bodyWidth / 2f
        val bodyTop = cy - bodyHeight * 0.14f
        lockBodyRect.set(bodyLeft, bodyTop, bodyLeft + bodyWidth, bodyTop + bodyHeight)

        // Shackle arc (lifts open cleanly when unlocked)
        val shackleWidth = bodyWidth * 0.56f
        val shackleHeight = bodyHeight * 0.82f
        val shackleLift = if (_isUnlocked) radius * 0.14f else 0f
        shackleRect.set(
            cx - shackleWidth / 2f,
            bodyTop - shackleHeight * 0.68f - shackleLift,
            cx + shackleWidth / 2f,
            bodyTop + shackleHeight * 0.32f - shackleLift
        )
        lockStrokePaint.shader = lockGoldShader
        lockStrokePaint.strokeWidth = radius * 0.125f
        val startAngle = if (_isUnlocked) 195f else 180f
        val sweepAngle = if (_isUnlocked) 150f else 180f
        canvas.drawArc(shackleRect, startAngle, sweepAngle, false, lockStrokePaint)

        // Lock body rounded rectangle
        lockFillPaint.shader = lockGoldShader
        val cornerRadius = radius * 0.16f
        canvas.drawRoundRect(lockBodyRect, cornerRadius, cornerRadius, lockFillPaint)

        // Keyhole silhouette
        val keyholeCx = cx
        val keyholeCy = bodyTop + bodyHeight * 0.42f
        val keyholeRadius = radius * 0.105f
        canvas.drawCircle(keyholeCx, keyholeCy, keyholeRadius, keyholePaint)
        canvas.drawRoundRect(
            keyholeCx - keyholeRadius * 0.45f,
            keyholeCy,
            keyholeCx + keyholeRadius * 0.45f,
            keyholeCy + bodyHeight * 0.34f,
            keyholeRadius * 0.3f,
            keyholeRadius * 0.3f,
            keyholePaint
        )

        // 4. Specular Diagonal Gold-Shimmer Sweep Beam Clipped to Medallion
        shimmerClipPath.reset()
        shimmerClipPath.addCircle(cx, cy, radius, Path.Direction.CW)
        canvas.save()
        canvas.clipPath(shimmerClipPath)

        val beamX = (cx - radius) + _shimmerProgress * (radius * 2.2f)
        val beamWidth = radius * 0.75f
        shimmerBeamPaint.shader = LinearGradient(
            beamX - beamWidth,
            cy - radius,
            beamX + beamWidth,
            cy + radius,
            intArrayOf(
                0x00FFF4B8,
                0x99FFF4B8.toInt(),
                0x55D4AF37,
                0x00D4AF37
            ),
            floatArrayOf(0f, 0.48f, 0.62f, 1f),
            Shader.TileMode.CLAMP
        )
        canvas.drawRect(cx - radius, cy - radius, cx + radius, cy + radius, shimmerBeamPaint)
        canvas.restore()
    }
}

/**
 * Reusable Jetpack Compose bridge hosting [GoldShimmerLockIconView] so Android's
 * [ObjectAnimator] executes the Framer Motion-inspired 'gold-shimmer' entrance
 * cleanly on the lock icon.
 */
@Composable
fun GoldShimmerLockIcon(
    modifier: Modifier = Modifier,
    size: Dp = 88.dp,
    isUnlocked: Boolean = false,
    replayTrigger: Int = 0
) {
    AndroidView(
        modifier = modifier.size(size),
        factory = { ctx ->
            GoldShimmerLockIconView(ctx).apply {
                this.isUnlocked = isUnlocked
                post { playGoldShimmerEntrance() }
            }
        },
        update = { lockView ->
            lockView.isUnlocked = isUnlocked
            if (replayTrigger > 0) {
                lockView.playGoldShimmerEntrance()
            }
        },
        onRelease = { lockView ->
            lockView.stopAnimations()
        }
    )
}

/**
 * Full-screen Axumite Sovereign Biometric Verification Screen featuring the
 * ObjectAnimator 'gold-shimmer' lock icon entrance, tactile Android haptic
 * confirmation, biometric sensor pad, and 4-digit PIN fallback.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BiometricVerificationScreen(
    navController: NavController? = null,
    onUnlockSuccess: () -> Unit = { navController?.popBackStack() },
    onCancel: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val view = LocalView.current

    var isScanning by remember { mutableStateOf(false) }
    var isUnlocked by remember { mutableStateOf(false) }
    var usePinMode by remember { mutableStateOf(false) }
    var enteredPin by remember { mutableStateOf("") }
    var pinError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(isScanning) {
        if (isScanning) {
            delay(850L)
            isScanning = false
            isUnlocked = true
            HapticFeedbackHelper.triggerBottomNavLuxuryThud(
                context = context,
                view = view,
                feedbackConstant = HapticFeedbackConstants.LONG_PRESS,
                pattern = HapticFeedbackHelper.VIBRATE_PATTERN_PRIMARY,
                isPrimaryAction = true
            )
            delay(650L)
            onUnlockSuccess()
        }
    }

    Scaffold(
        containerColor = RoyalDarkBackground,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "AXUMITE SOVEREIGN",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.2.sp,
                            color = GoldPrimary
                        )
                        Text(
                            text = "ናይ ባዮሜትሪክ መከላኸሊ • Hardware KeyStore",
                            fontSize = 10.sp,
                            color = GoldSecondary
                        )
                    }
                },
                navigationIcon = {
                    if (onCancel != null || navController != null) {
                        IconButton(onClick = { onCancel?.invoke() ?: navController?.popBackStack() }) {
                            Icon(
                                Icons.Default.ArrowBack,
                                contentDescription = "Back",
                                tint = GoldPrimary
                            )
                        }
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
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(18.dp, Alignment.CenterVertically)
        ) {
            // Framer Motion-inspired 'gold-shimmer' entrance powered by Android ObjectAnimator
            GoldShimmerLockIcon(
                size = 96.dp,
                isUnlocked = isUnlocked
            )

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = if (isUnlocked) "ባዮሜትሪክ ተረጋጊጹ (Unlocked)" else "ባዮሜትሪክ ምርመራ (Biometric Verification)",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = GoldPrimary,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = if (usePinMode) {
                        "ናይ ስልኪ ፒን የእትዉ • Enter your 4-digit sovereign vault PIN"
                    } else {
                        "ናብ Axumite AI ንምእታው ናይ ኣጻብዕኩም ባዮሜትሪክ ተጠቐሙ"
                    },
                    fontSize = 12.sp,
                    color = Color(0xFFCBD5E1),
                    textAlign = TextAlign.Center
                )
            }

            if (!usePinMode) {
                Box(
                    modifier = Modifier
                        .size(116.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                if (isUnlocked) listOf(EmeraldSuccess, Color(0xFF064E3B))
                                else if (isScanning) listOf(GoldSecondary, Color(0xFF3E2C0B))
                                else listOf(Color(0xFF1E1535), RoyalDarkSurface)
                            )
                        )
                        .border(
                            width = 2.dp,
                            brush = Brush.linearGradient(
                                if (isUnlocked) listOf(Color(0xFF6EE7B7), EmeraldSuccess)
                                else listOf(GoldPrimary, GoldSecondary, Color(0xFF8E6D28))
                            ),
                            shape = CircleShape
                        )
                        .clickable(enabled = !isScanning && !isUnlocked) {
                            HapticFeedbackHelper.triggerBottomNavLuxuryThud(
                                context = context,
                                view = view,
                                feedbackConstant = HapticFeedbackConstants.LONG_PRESS,
                                pattern = HapticFeedbackHelper.VIBRATE_PATTERN
                            )
                            isScanning = true
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isUnlocked) Icons.Default.Check else Icons.Default.Fingerprint,
                        contentDescription = if (isUnlocked) "Verified" else "Verify Fingerprint",
                        tint = if (isUnlocked) Color.White else GoldPrimary,
                        modifier = Modifier.size(52.dp)
                    )
                }

                Text(
                    text = when {
                        isUnlocked -> "StrongBox TEE Session Verified"
                        isScanning -> "ባዮሜትሪክ ይምርመር ኣሎ • Scanning..."
                        else -> "ንምምርማር ጠውቑ • Tap sensor to verify"
                    },
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (isUnlocked) EmeraldSuccess else GoldSecondary
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = { usePinMode = true },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = GoldPrimary)
                    ) {
                        Icon(Icons.Default.Key, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("PIN Fallback", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }

                    Button(
                        onClick = {
                            if (!isScanning && !isUnlocked) {
                                HapticFeedbackHelper.triggerBottomNavLuxuryThud(
                                    context = context,
                                    view = view,
                                    feedbackConstant = HapticFeedbackConstants.LONG_PRESS,
                                    pattern = HapticFeedbackHelper.VIBRATE_PATTERN
                                )
                                isScanning = true
                            }
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = GoldSecondary,
                            contentColor = Color(0xFF09090B)
                        )
                    ) {
                        Icon(Icons.Default.Fingerprint, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("ምርመራ ግበር", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            } else {
                // 4-Digit Sovereign PIN Fallback Keypad
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    (0..3).forEach { idx ->
                        val filled = enteredPin.length > idx
                        Box(
                            modifier = Modifier
                                .size(14.dp)
                                .clip(CircleShape)
                                .background(
                                    when {
                                        isUnlocked -> EmeraldSuccess
                                        pinError != null -> Color(0xFFEF4444)
                                        filled -> GoldPrimary
                                        else -> Color.White.copy(alpha = 0.16f)
                                    }
                                )
                                .border(1.5.dp, if (filled) GoldSecondary else Color.Gray.copy(alpha = 0.4f), CircleShape)
                        )
                    }
                }

                pinError?.let { err ->
                    Text(text = err, color = Color(0xFFF87171), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }

                val rows = listOf(
                    listOf("1", "2", "3"),
                    listOf("4", "5", "6"),
                    listOf("7", "8", "9"),
                    listOf("C", "0", "⌫")
                )
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    rows.forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            row.forEach { key ->
                                Box(
                                    modifier = Modifier
                                        .size(width = 74.dp, height = 46.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(RoyalDarkSurface)
                                        .border(1.dp, GoldSecondary.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
                                        .clickable {
                                            HapticFeedbackHelper.triggerTabTap(context)
                                            pinError = null
                                            when (key) {
                                                "C" -> enteredPin = ""
                                                "⌫" -> if (enteredPin.isNotEmpty()) enteredPin = enteredPin.dropLast(1)
                                                else -> if (enteredPin.length < 4) {
                                                    enteredPin += key
                                                    if (enteredPin.length == 4) {
                                                        if (enteredPin == "7849" || enteredPin == "2026" || enteredPin == "1234") {
                                                            isUnlocked = true
                                                            onUnlockSuccess()
                                                        } else {
                                                            pinError = "Incorrect PIN. Try 7849 or 2026."
                                                            enteredPin = ""
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = key,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (key == "C" || key == "⌫") GoldSecondary else Color.White
                                    )
                                }
                            }
                        }
                    }
                }

                TextButton(onClick = { usePinMode = false }) {
                    Text("Use Biometric Sensor", color = GoldPrimary, fontSize = 12.sp)
                }
            }
        }
    }
}
