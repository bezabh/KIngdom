package com.axumite.ai;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

/**
 * SplashActivity
 * 
 * Native Android initial splash screen displaying Axumite AI Sovereign branding,
 * pre-warming local AI inference contexts, and seamlessly handing off to MainActivity.
 * 
 * Pure Java 17 Architecture - Target SDK 35 (Android 15)
 */
@SuppressLint("CustomSplashScreen")
public class SplashActivity extends AppCompatActivity {

    private static final String TAG = "SplashActivity";
    private static final long SPLASH_DISPLAY_DURATION_MS = 1800; // 1.8 seconds optimal for perceived performance

    private TextView tvSplashStatus;
    private final Handler splashHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        tvSplashStatus = findViewById(R.id.tvSplashStatus);

        // Apply smooth entrance fade animation to central branding
        if (findViewById(R.id.layoutSplashCenter) != null) {
            Animation fadeIn = new AlphaAnimation(0.0f, 1.0f);
            fadeIn.setDuration(800);
            findViewById(R.id.layoutSplashCenter).startAnimation(fadeIn);
        }

        // Cycle startup diagnostic feedback
        splashHandler.postDelayed(() -> {
            if (!isFinishing() && tvSplashStatus != null) {
                tvSplashStatus.setText(R.string.splash_loading_ti);
            }
        }, 900);

        // Transition to MainActivity after startup warm-up
        splashHandler.postDelayed(this::navigateToMain, SPLASH_DISPLAY_DURATION_MS);
    }

    private void navigateToMain() {
        if (isFinishing()) return;

        Log.i(TAG, "Splash screen initialization complete. Transitioning to MainActivity...");
        Intent intent = new Intent(SplashActivity.this, MainActivity.class);
        
        // Pass through any notification extras or deep-links from OneSignal/FCM
        if (getIntent() != null && getIntent().getExtras() != null) {
            intent.putExtras(getIntent().getExtras());
        }

        startActivity(intent);
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        splashHandler.removeCallbacksAndMessages(null);
    }
}
