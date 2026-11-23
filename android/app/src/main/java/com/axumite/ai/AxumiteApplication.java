package com.axumite.ai;

import android.app.Application;
import android.util.Log;

public class AxumiteApplication extends Application {

    private static final String TAG = "AxumiteApplication";
    private static AxumiteApplication instance;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        Log.i(TAG, "Axumite AI Sovereign Android Engine initialized in Java 17 (Target SDK 35).");
    }

    public static AxumiteApplication getInstance() {
        return instance;
    }
}
