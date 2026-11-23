package com.axumite.ai.service;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;
import androidx.annotation.Nullable;

public class TigrinyaSpeechRecognitionService extends Service {

    private static final String TAG = "TigrinyaSpeechService";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "Tigrinya & Ge'ez On-Device Acoustic Neural Service started in Java.");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "Processing background continuous speech recognition buffer...");
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.i(TAG, "Tigrinya Speech Recognition Service stopped.");
    }
}
